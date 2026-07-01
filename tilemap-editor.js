(function () {
    const MAP_URL = 'map/map_full.tmj';
    const SAVE_URL = 'save-map';
    const EMPTY_TILE = 0;
    const DEFAULT_ZOOM = 2;

    class TilemapEditor {
        constructor() {
            this.map = null;
            this.tileLayers = [];
            this.objectLayers = [];
            this.tilesets = [];
            this.paintableTilesets = [];
            this.activeTileset = null;
            this.activeLayerIndex = 0;
            this.selectedGid = 1;
            this.tool = 'brush';
            this.zoom = DEFAULT_ZOOM;
            this.offsetX = 0;
            this.offsetY = 0;
            this.isPointerDown = false;
            this.isPanning = false;
            this.lastPointer = null;
            this.strokeBefore = null;
            this.strokeChanged = false;
            this.hoverCell = null;
            this.undoStack = [];
            this.redoStack = [];
            this.dirty = false;
            this.lastSavedSnapshot = '';
            this.isSaving = false;

            this.canvas = document.getElementById('mapCanvas');
            this.frame = document.getElementById('canvasFrame');
            this.ctx = this.canvas.getContext('2d');
            this.layerSelect = document.getElementById('layerSelect');
            this.tilesetSelect = document.getElementById('tilesetSelect');
            this.palette = document.getElementById('palette');
            this.paletteCount = document.getElementById('paletteCount');
            this.statusText = document.getElementById('statusText');
            this.cellReadout = document.getElementById('cellReadout');
            this.zoomReadout = document.getElementById('zoomReadout');
            this.selectedGidLabel = document.getElementById('selectedGid');
            this.selectedTileCanvas = document.getElementById('selectedTileCanvas');
            this.gridToggle = document.getElementById('gridToggle');
            this.objectsToggle = document.getElementById('objectsToggle');
            this.undoButton = document.getElementById('undoButton');
            this.redoButton = document.getElementById('redoButton');
            this.saveButton = document.getElementById('saveButton');
        }

        async init() {
            this.bindUi();
            await this.loadMap();
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.render();
        }

        bindUi() {
            document.getElementById('toolGrid').addEventListener('click', (event) => {
                const button = event.target.closest('[data-tool]');
                if (!button) return;
                this.setTool(button.dataset.tool);
            });

            this.layerSelect.addEventListener('change', () => {
                this.activeLayerIndex = Number(this.layerSelect.value);
                this.buildTilesetSelect();
                this.pickDefaultTilesetForLayer();
                this.setStatus(`Editing ${this.getActiveLayer().name}`);
                this.render();
            });

            this.tilesetSelect.addEventListener('change', () => {
                this.activeTileset = this.getPaintableTilesetsForLayer(this.getActiveLayer())
                    .find((tileset) => tileset.key === this.tilesetSelect.value);
                this.selectedGid = this.activeTileset ? this.activeTileset.firstgid : EMPTY_TILE;
                this.buildPalette();
                this.updateSelectedTile();
                this.render();
            });

            document.getElementById('zoomOut').addEventListener('click', () => this.zoomAtCenter(0.8));
            document.getElementById('zoomIn').addEventListener('click', () => this.zoomAtCenter(1.25));
            document.getElementById('zoomReset').addEventListener('click', () => {
                this.zoom = DEFAULT_ZOOM;
                this.offsetX = 0;
                this.offsetY = 0;
                this.render();
            });

            this.gridToggle.addEventListener('change', () => this.render());
            this.objectsToggle.addEventListener('change', () => this.render());
            this.undoButton.addEventListener('click', () => this.undo());
            this.redoButton.addEventListener('click', () => this.redo());
            this.saveButton.addEventListener('click', () => this.saveMap());
            document.getElementById('downloadButton').addEventListener('click', () => this.downloadMap());
            document.getElementById('reloadButton').addEventListener('click', () => this.loadMap().then(() => this.render()));

            this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
            this.canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
            this.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
            window.addEventListener('pointerup', () => this.onPointerUp());
            this.canvas.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
        }

        async loadMap() {
            this.setStatus('Loading map...');
            const response = await fetch(`${MAP_URL}?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${MAP_URL}`);
            }

            this.map = await response.json();
            this.tileLayers = this.map.layers
                .map((layer, index) => ({ layer, index }))
                .filter((entry) => entry.layer.type === 'tilelayer' && Array.isArray(entry.layer.data));
            this.objectLayers = this.map.layers.filter((layer) => layer.type === 'objectgroup');

            await this.loadTilesets();
            this.buildLayerSelect();
            this.buildTilesetSelect();
            this.pickDefaultTilesetForLayer();
            this.undoStack = [];
            this.redoStack = [];
            this.lastSavedSnapshot = this.createTileSnapshot();
            this.updateDirtyState();
            this.setStatus('Map loaded');
            this.updateHistoryButtons();
        }

        async loadTilesets() {
            const loaded = [];
            const seenOakTileset = new Set();

            for (const tileset of this.map.tilesets) {
                if (tileset.name === 'char_blue_1') {
                    continue;
                }

                const normalized = {
                    ...tileset,
                    key: `${tileset.name}:${tileset.firstgid}`,
                    imageElement: null,
                    tileImages: new Map(),
                    missing: false
                };

                if (tileset.image) {
                    if (tileset.name === 'oak_woods_tileset' && seenOakTileset.has(tileset.name)) {
                        continue;
                    }
                    seenOakTileset.add(tileset.name);

                    const imagePath = this.normalizeAssetPath(tileset.image);
                    normalized.imagePath = imagePath;
                    try {
                        normalized.imageElement = await this.loadImage(imagePath);
                    } catch {
                        normalized.missing = true;
                    }
                }

                if (Array.isArray(tileset.tiles)) {
                    for (const tile of tileset.tiles) {
                        if (!tile.image) continue;
                        try {
                            const image = await this.loadImage(this.normalizeAssetPath(tile.image));
                            normalized.tileImages.set(tileset.firstgid + tile.id, {
                                image,
                                width: tile.imagewidth || image.naturalWidth,
                                height: tile.imageheight || image.naturalHeight
                            });
                        } catch {
                            normalized.missing = true;
                        }
                    }
                }

                loaded.push(normalized);
            }

            this.tilesets = loaded;
            this.paintableTilesets = loaded.filter((tileset) => {
                return tileset.imageElement || tileset.tileImages.size > 0;
            });
        }

        normalizeAssetPath(path) {
            return path.replace(/^\.\.\//, '');
        }

        loadImage(src) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = src;
            });
        }

        buildLayerSelect() {
            this.layerSelect.innerHTML = '';
            this.tileLayers.forEach((entry, optionIndex) => {
                const option = document.createElement('option');
                option.value = String(optionIndex);
                option.textContent = entry.layer.name;
                this.layerSelect.appendChild(option);
            });
            this.activeLayerIndex = Math.min(this.activeLayerIndex, this.tileLayers.length - 1);
            this.layerSelect.value = String(this.activeLayerIndex);
        }

        buildTilesetSelect() {
            this.tilesetSelect.innerHTML = '';
            const activeLayer = this.getActiveLayer();
            const tilesets = this.getPaintableTilesetsForLayer(activeLayer);

            this.tilesetSelect.disabled = tilesets.length === 0;
            tilesets.forEach((tileset) => {
                const option = document.createElement('option');
                option.value = tileset.key;
                option.textContent = `${tileset.name} (${tileset.firstgid})`;
                this.tilesetSelect.appendChild(option);
            });
        }

        pickDefaultTilesetForLayer() {
            const activeLayer = this.getActiveLayer();
            const tilesets = this.getPaintableTilesetsForLayer(activeLayer);
            const currentTileset = tilesets.find((tileset) => tileset.key === this.activeTileset?.key);
            const wantsDecorations = this.isDecorationLayer(activeLayer);
            const preferredTileset = tilesets.find((tileset) => {
                return wantsDecorations ? tileset.name === '装饰' : tileset.name === 'oak_woods_tileset';
            });
            const nextTileset = currentTileset || preferredTileset || tilesets[0] || null;

            this.activeTileset = nextTileset;
            if (nextTileset) {
                this.tilesetSelect.value = nextTileset.key;
                if (!this.canPaintGidOnLayer(activeLayer, this.selectedGid)) {
                    this.selectedGid = nextTileset.firstgid;
                }
            } else {
                this.selectedGid = EMPTY_TILE;
            }

            this.buildPalette();
            this.updateSelectedTile();
        }

        getPaintableTilesetsForLayer(layer) {
            if (!layer) return [];
            if (this.isDecorationLayer(layer)) {
                return this.paintableTilesets.filter((tileset) => tileset.name === '装饰');
            }
            if (this.isTerrainLayer(layer)) {
                return this.paintableTilesets.filter((tileset) => tileset.name === 'oak_woods_tileset');
            }
            return this.paintableTilesets;
        }

        isTerrainLayer(layer) {
            return Boolean(layer && layer.name === '地块层');
        }

        isDecorationLayer(layer) {
            return Boolean(layer && layer.name === '装饰层');
        }

        canPaintGidOnLayer(layer, gid) {
            if (gid === EMPTY_TILE) return true;
            const tileset = this.findTileset(gid);
            if (!tileset) return false;
            return this.getPaintableTilesetsForLayer(layer).some((entry) => entry.key === tileset.key);
        }

        buildPalette() {
            this.palette.innerHTML = '';
            if (!this.activeTileset) {
                this.paletteCount.textContent = '0';
                return;
            }

            const gids = [];
            if (this.activeTileset.imageElement) {
                for (let i = 0; i < this.activeTileset.tilecount; i++) {
                    gids.push(this.activeTileset.firstgid + i);
                }
            } else {
                gids.push(...this.activeTileset.tileImages.keys());
            }

            this.paletteCount.textContent = String(gids.length);

            for (const gid of gids) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'tile-option';
                button.title = `GID ${gid}`;
                button.dataset.gid = String(gid);

                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = 48;
                tileCanvas.height = 48;
                const tileCtx = tileCanvas.getContext('2d');
                tileCtx.imageSmoothingEnabled = false;
                this.drawTile(tileCtx, gid, 0, 0, 48, 48, true);

                button.appendChild(tileCanvas);
                button.addEventListener('click', () => {
                    this.selectedGid = gid;
                    this.setTool('brush');
                    this.updateSelectedTile();
                    this.updatePaletteSelection();
                });
                this.palette.appendChild(button);
            }

            this.updatePaletteSelection();
        }

        updatePaletteSelection() {
            this.palette.querySelectorAll('.tile-option').forEach((button) => {
                button.classList.toggle('is-active', Number(button.dataset.gid) === this.selectedGid);
            });
        }

        updateSelectedTile() {
            this.selectedGidLabel.textContent = String(this.selectedGid);
            const ctx = this.selectedTileCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.selectedTileCanvas.width, this.selectedTileCanvas.height);
            ctx.imageSmoothingEnabled = false;
            if (this.selectedGid !== EMPTY_TILE) {
                this.drawTile(ctx, this.selectedGid, 0, 0, 48, 48, true);
            }
        }

        setTool(tool) {
            this.tool = tool;
            document.querySelectorAll('[data-tool]').forEach((button) => {
                button.classList.toggle('is-active', button.dataset.tool === tool);
            });
            this.canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
        }

        resizeCanvas() {
            const rect = this.frame.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            this.canvas.style.width = `${rect.width}px`;
            this.canvas.style.height = `${rect.height}px`;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this.render();
        }

        render() {
            if (!this.map) return;

            const rect = this.canvas.getBoundingClientRect();
            this.ctx.save();
            this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
            this.ctx.clearRect(0, 0, rect.width, rect.height);
            this.ctx.imageSmoothingEnabled = false;

            this.ctx.fillStyle = '#d8e7e4';
            this.ctx.fillRect(0, 0, rect.width, rect.height);
            this.ctx.translate(-this.offsetX * this.zoom, -this.offsetY * this.zoom);
            this.ctx.scale(this.zoom, this.zoom);

            this.drawTileLayers();
            if (this.objectsToggle.checked) {
                this.drawObjects();
            }
            if (this.gridToggle.checked) {
                this.drawGrid();
            }
            this.drawHoverCell();
            this.ctx.restore();

            this.updateReadouts();
        }

        drawTileLayers() {
            const activeLayer = this.getActiveLayer();
            const tileSize = this.map.tilewidth;
            const viewport = this.getVisibleTileRange();

            for (const entry of this.tileLayers) {
                const layer = entry.layer;
                const isActive = layer === activeLayer;
                const alpha = isActive || layer.name === '地块层' ? (layer.opacity ?? 1) : 0.38;
                this.ctx.globalAlpha = layer.visible === false ? 0 : alpha;

                for (let y = viewport.minY; y <= viewport.maxY; y++) {
                    for (let x = viewport.minX; x <= viewport.maxX; x++) {
                        const gid = layer.data[y * this.map.width + x];
                        if (!gid) continue;
                        this.drawTile(this.ctx, gid, x * tileSize, y * tileSize, tileSize, tileSize, false);
                    }
                }
            }

            this.ctx.globalAlpha = 1;
        }

        drawObjects() {
            const colors = {
                '出生点': '#1d5b4b',
                '史莱姆': '#619b4a',
                '骷髅兵': '#8c6b39',
                '死神': '#8e3630',
                '小宝箱': '#bb8a2e',
                '大宝箱': '#bb8a2e',
                '攻击教学': '#4a73a8',
                '爬墙教学': '#4a73a8'
            };

            this.ctx.save();
            this.ctx.font = '8px sans-serif';
            this.ctx.textBaseline = 'bottom';

            for (const layer of this.objectLayers) {
                for (const object of layer.objects || []) {
                    const label = object.name || object.type || 'object';
                    const color = colors[label] || colors[object.type] || '#5d5550';
                    const x = object.x;
                    const y = object.y;
                    const width = object.width || 12;
                    const height = object.height || 12;

                    this.ctx.fillStyle = color;
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 1 / this.zoom;
                    this.ctx.globalAlpha = 0.88;

                    if (object.point) {
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.stroke();
                    } else {
                        this.ctx.fillRect(x, y - height, width, height);
                        this.ctx.strokeRect(x, y - height, width, height);
                    }

                    this.ctx.globalAlpha = 1;
                    this.ctx.fillStyle = '#1f1f1d';
                    this.ctx.fillText(label, x + 5, y - 5);
                }
            }

            this.ctx.restore();
        }

        drawGrid() {
            if (this.zoom < 0.55) return;

            const tileSize = this.map.tilewidth;
            const width = this.map.width * tileSize;
            const height = this.map.height * tileSize;
            const viewport = this.getVisibleTileRange();

            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(32, 32, 29, 0.18)';
            this.ctx.lineWidth = 1 / this.zoom;

            for (let x = viewport.minX; x <= viewport.maxX + 1; x++) {
                const px = x * tileSize;
                this.ctx.beginPath();
                this.ctx.moveTo(px, 0);
                this.ctx.lineTo(px, height);
                this.ctx.stroke();
            }

            for (let y = viewport.minY; y <= viewport.maxY + 1; y++) {
                const py = y * tileSize;
                this.ctx.beginPath();
                this.ctx.moveTo(0, py);
                this.ctx.lineTo(width, py);
                this.ctx.stroke();
            }

            this.ctx.restore();
        }

        drawHoverCell() {
            if (!this.hoverCell) return;

            const tileSize = this.map.tilewidth;
            this.ctx.save();
            this.ctx.strokeStyle = '#26745f';
            this.ctx.lineWidth = 2 / this.zoom;
            this.ctx.strokeRect(
                this.hoverCell.x * tileSize,
                this.hoverCell.y * tileSize,
                tileSize,
                tileSize
            );
            this.ctx.restore();
        }

        drawTile(ctx, gid, dx, dy, dw, dh, fitContain) {
            const tileset = this.findTileset(gid);
            if (!tileset) return;

            if (tileset.imageElement) {
                const localId = gid - tileset.firstgid;
                const columns = tileset.columns || Math.floor(tileset.imageElement.naturalWidth / tileset.tilewidth);
                const sx = (localId % columns) * tileset.tilewidth;
                const sy = Math.floor(localId / columns) * tileset.tileheight;
                ctx.drawImage(
                    tileset.imageElement,
                    sx,
                    sy,
                    tileset.tilewidth,
                    tileset.tileheight,
                    dx,
                    dy,
                    dw,
                    dh
                );
                return;
            }

            const tile = tileset.tileImages.get(gid);
            if (!tile) return;

            if (fitContain) {
                const scale = Math.min(dw / tile.width, dh / tile.height);
                const width = tile.width * scale;
                const height = tile.height * scale;
                ctx.drawImage(tile.image, dx + (dw - width) / 2, dy + (dh - height) / 2, width, height);
            } else {
                ctx.drawImage(tile.image, dx, dy, dw, dh);
            }
        }

        findTileset(gid) {
            let match = null;
            for (const tileset of this.tilesets) {
                if (gid >= tileset.firstgid && gid < tileset.firstgid + tileset.tilecount) {
                    if (!match || tileset.firstgid > match.firstgid) {
                        match = tileset;
                    }
                }
            }
            return match;
        }

        getVisibleTileRange() {
            const rect = this.canvas.getBoundingClientRect();
            const tileSize = this.map.tilewidth;
            const minX = Math.max(0, Math.floor(this.offsetX / tileSize) - 1);
            const minY = Math.max(0, Math.floor(this.offsetY / tileSize) - 1);
            const maxX = Math.min(this.map.width - 1, Math.ceil((this.offsetX + rect.width / this.zoom) / tileSize) + 1);
            const maxY = Math.min(this.map.height - 1, Math.ceil((this.offsetY + rect.height / this.zoom) / tileSize) + 1);
            return { minX, minY, maxX, maxY };
        }

        onPointerDown(event) {
            this.canvas.setPointerCapture(event.pointerId);
            this.isPointerDown = true;
            this.lastPointer = { x: event.clientX, y: event.clientY };
            this.isPanning = this.tool === 'pan' || event.button === 1 || event.button === 2;

            if (this.isPanning) {
                this.canvas.style.cursor = 'grabbing';
                return;
            }

            this.strokeBefore = this.getActiveLayer().data.slice();
            this.strokeChanged = false;
            this.applyToolAtEvent(event);
        }

        onPointerMove(event) {
            const cell = this.eventToCell(event);
            this.hoverCell = cell;

            if (this.isPointerDown && this.isPanning && this.lastPointer) {
                const dx = (event.clientX - this.lastPointer.x) / this.zoom;
                const dy = (event.clientY - this.lastPointer.y) / this.zoom;
                this.offsetX -= dx;
                this.offsetY -= dy;
                this.clampOffset();
                this.lastPointer = { x: event.clientX, y: event.clientY };
                this.render();
                return;
            }

            if (this.isPointerDown && !this.isPanning && this.tool !== 'fill') {
                this.applyToolAtEvent(event);
            } else {
                this.render();
            }
        }

        onPointerUp() {
            if (this.isPointerDown && this.strokeBefore && this.strokeChanged) {
                this.pushHistory(this.strokeBefore, this.getActiveLayer().data.slice());
                this.updateDirtyState();
            }

            this.isPointerDown = false;
            this.isPanning = false;
            this.strokeBefore = null;
            this.strokeChanged = false;
            this.canvas.style.cursor = this.tool === 'pan' ? 'grab' : 'crosshair';
        }

        onWheel(event) {
            event.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const point = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
            const factor = event.deltaY < 0 ? 1.12 : 0.88;
            this.zoomAtPoint(point, factor);
        }

        applyToolAtEvent(event) {
            const cell = this.eventToCell(event);
            if (!cell) return;

            const layer = this.getActiveLayer();
            const index = cell.y * this.map.width + cell.x;

            if (this.tool === 'pick') {
                const gid = layer.data[index] || EMPTY_TILE;
                if (gid !== EMPTY_TILE) {
                    if (!this.canPaintGidOnLayer(layer, gid)) {
                        this.setStatus(`GID ${gid} is not paintable on ${layer.name}`, true);
                        return;
                    }
                    const pickedTileset = this.findTileset(gid);
                    if (pickedTileset && pickedTileset.key !== this.activeTileset?.key) {
                        this.activeTileset = pickedTileset;
                        this.tilesetSelect.value = pickedTileset.key;
                        this.buildPalette();
                    }
                    this.selectedGid = gid;
                    this.updateSelectedTile();
                    this.updatePaletteSelection();
                    this.setTool('brush');
                }
                return;
            }

            if (this.tool === 'fill') {
                if (!this.canPaintGidOnLayer(layer, this.selectedGid)) {
                    this.setStatus(`GID ${this.selectedGid} is not paintable on ${layer.name}`, true);
                    return;
                }
                this.floodFill(cell.x, cell.y, this.selectedGid);
                this.render();
                return;
            }

            const nextGid = this.tool === 'erase' ? EMPTY_TILE : this.selectedGid;
            if (!this.canPaintGidOnLayer(layer, nextGid)) {
                this.setStatus(`GID ${nextGid} is not paintable on ${layer.name}`, true);
                return;
            }

            if (layer.data[index] !== nextGid) {
                layer.data[index] = nextGid;
                this.strokeChanged = true;
                this.updateDirtyState();
                this.setStatus(`Changed ${layer.name} (${cell.x},${cell.y}) to GID ${nextGid}`);
                this.render();
            }
        }

        floodFill(startX, startY, nextGid) {
            const layer = this.getActiveLayer();
            const index = startY * this.map.width + startX;
            const previousGid = layer.data[index];
            if (previousGid === nextGid) return;

            const before = layer.data.slice();
            const stack = [[startX, startY]];

            while (stack.length > 0) {
                const [x, y] = stack.pop();
                if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) continue;
                const currentIndex = y * this.map.width + x;
                if (layer.data[currentIndex] !== previousGid) continue;

                layer.data[currentIndex] = nextGid;
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }

            this.pushHistory(before, layer.data.slice());
            this.updateDirtyState();
            this.setStatus(`Filled ${layer.name} from (${startX},${startY}) with GID ${nextGid}`);
        }

        eventToCell(event) {
            const rect = this.canvas.getBoundingClientRect();
            const worldX = this.offsetX + (event.clientX - rect.left) / this.zoom;
            const worldY = this.offsetY + (event.clientY - rect.top) / this.zoom;
            const tileSize = this.map.tilewidth;
            const x = Math.floor(worldX / tileSize);
            const y = Math.floor(worldY / tileSize);

            if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) {
                return null;
            }
            return { x, y };
        }

        zoomAtCenter(factor) {
            const rect = this.canvas.getBoundingClientRect();
            this.zoomAtPoint({ x: rect.width / 2, y: rect.height / 2 }, factor);
        }

        zoomAtPoint(point, factor) {
            const worldX = this.offsetX + point.x / this.zoom;
            const worldY = this.offsetY + point.y / this.zoom;
            this.zoom = Math.max(0.35, Math.min(6, this.zoom * factor));
            this.offsetX = worldX - point.x / this.zoom;
            this.offsetY = worldY - point.y / this.zoom;
            this.clampOffset();
            this.render();
        }

        clampOffset() {
            if (!this.map) return;
            const rect = this.canvas.getBoundingClientRect();
            const mapWidth = this.map.width * this.map.tilewidth;
            const mapHeight = this.map.height * this.map.tileheight;
            this.offsetX = Math.max(0, Math.min(this.offsetX, Math.max(0, mapWidth - rect.width / this.zoom)));
            this.offsetY = Math.max(0, Math.min(this.offsetY, Math.max(0, mapHeight - rect.height / this.zoom)));
        }

        pushHistory(before, after) {
            this.undoStack.push({
                layerOptionIndex: this.activeLayerIndex,
                layerIndex: this.tileLayers[this.activeLayerIndex].index,
                before,
                after
            });
            this.redoStack = [];
            this.updateHistoryButtons();
        }

        undo() {
            const entry = this.undoStack.pop();
            if (!entry) return;

            this.activeLayerIndex = entry.layerOptionIndex;
            this.layerSelect.value = String(this.activeLayerIndex);
            this.buildTilesetSelect();
            this.pickDefaultTilesetForLayer();
            this.map.layers[entry.layerIndex].data = entry.before.slice();
            this.redoStack.push(entry);
            this.updateDirtyState();
            this.updateHistoryButtons();
            this.render();
            this.setStatus('Undo applied');
        }

        redo() {
            const entry = this.redoStack.pop();
            if (!entry) return;

            this.activeLayerIndex = entry.layerOptionIndex;
            this.layerSelect.value = String(this.activeLayerIndex);
            this.buildTilesetSelect();
            this.pickDefaultTilesetForLayer();
            this.map.layers[entry.layerIndex].data = entry.after.slice();
            this.undoStack.push(entry);
            this.updateDirtyState();
            this.updateHistoryButtons();
            this.render();
            this.setStatus('Redo applied');
        }

        updateHistoryButtons() {
            this.undoButton.disabled = this.undoStack.length === 0;
            this.redoButton.disabled = this.redoStack.length === 0;
        }

        createTileSnapshot() {
            return JSON.stringify(this.tileLayers.map((entry) => ({
                name: entry.layer.name,
                data: entry.layer.data
            })));
        }

        updateDirtyState() {
            this.dirty = this.createTileSnapshot() !== this.lastSavedSnapshot;
            this.updateSaveButton();
        }

        updateSaveButton() {
            this.saveButton.disabled = this.isSaving || !this.dirty;
        }

        async saveMap() {
            this.updateDirtyState();
            if (!this.dirty) {
                this.setStatus('No tile changes to save');
                return;
            }

            this.setStatus('Saving map...');
            this.isSaving = true;
            this.updateSaveButton();
            try {
                const response = await fetch(SAVE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: MAP_URL,
                        map: this.map
                    })
                });
                const payload = await response.json();
                if (!response.ok || !payload.ok) {
                    throw new Error(payload.error || 'Save failed');
                }
                this.lastSavedSnapshot = this.createTileSnapshot();
                this.updateDirtyState();
                this.setStatus(`Saved ${payload.path}`);
            } catch (error) {
                this.setStatus(error.message, true);
            } finally {
                this.isSaving = false;
                this.updateSaveButton();
            }
        }

        downloadMap() {
            const blob = new Blob([JSON.stringify(this.map, null, 1) + '\n'], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'map_full.tmj';
            link.click();
            URL.revokeObjectURL(url);
        }

        getActiveLayer() {
            return this.tileLayers[this.activeLayerIndex].layer;
        }

        updateReadouts() {
            if (this.hoverCell) {
                this.cellReadout.textContent = `Cell ${this.hoverCell.x},${this.hoverCell.y}`;
            } else {
                this.cellReadout.textContent = 'Cell -,-';
            }
            this.zoomReadout.textContent = `${Math.round(this.zoom * 100)}%`;
        }

        setStatus(message, isError) {
            this.statusText.textContent = message;
            this.statusText.classList.toggle('is-error', Boolean(isError));
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        const editor = new TilemapEditor();
        editor.init().catch((error) => {
            const status = document.getElementById('statusText');
            status.textContent = error.message;
            status.classList.add('is-error');
            console.error(error);
        });
        window.tilemapEditor = editor;
    });
})();
