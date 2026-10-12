/**
 * 3D Vector Space Engine & Canvas Renderer
 * High-performance 3D projection, camera orbit, raycasting, and geometric overlays
 */

import { CATEGORIES } from './dataset.js';

export class Space3D {
  constructor(canvasContainerId, onNodeSelect, onHover) {
    this.container = document.getElementById(canvasContainerId);
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.onNodeSelect = onNodeSelect;
    this.onHover = onHover;

    // Camera and Scene properties
    this.camera = {
      rotX: 0.35,
      rotY: 0.65,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      fov: 480
    };

    this.isDragging = false;
    this.isPanning = false;
    this.lastMouse = { x: 0, y: 0 };
    this.hoveredNode = null;
    this.selectedNode = null;

    // Render Data
    this.nodes = []; // { id, data, currentPos: [x,y,z], targetPos: [x,y,z], screen: {x,y,z,r} }
    this.queryVectorPoint = null; // { pos: [x,y,z], label: string, pulsePhase: 0 }
    this.topKConnections = []; // array of { targetId, distance, score, color }
    this.graphEdges = []; // array of { sourcePos, targetPos, color, layer }
    this.centroids = []; // array of { pos, color, radius }
    this.showGrid = true;
    this.showHnswEdges = false;
    this.showVoronoi = false;
    this.autoRotate = false;

    this.initEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  initEvents() {
    // Mouse Down
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.shiftKey) {
        this.isPanning = true;
      } else {
        this.isDragging = true;
      }
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    // Mouse Move
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.isDragging) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.camera.rotY += dx * 0.008;
        this.camera.rotX += dy * 0.008;
        this.camera.rotX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.camera.rotX));
        this.lastMouse = { x: e.clientX, y: e.clientY };
      } else if (this.isPanning) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.camera.panX += dx;
        this.camera.panY += dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      } else {
        this.checkHover(mouseX, mouseY);
      }
    });

    // Mouse Up
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    // Click to select
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const clicked = this.findNodeAt(mouseX, mouseY);
      if (clicked) {
        this.selectedNode = clicked;
        if (this.onNodeSelect) this.onNodeSelect(clicked.data);
      }
    });

    // Wheel Zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.camera.zoom = Math.max(0.3, Math.min(3.5, this.camera.zoom * zoomFactor));
    }, { passive: false });

    // Context Menu Prevent
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch Support
    let touchDist = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouse.x;
        const dy = e.touches[0].clientY - this.lastMouse.y;
        this.camera.rotY += dx * 0.008;
        this.camera.rotX += dy * 0.008;
        this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / (touchDist || dist);
        this.camera.zoom = Math.max(0.3, Math.min(3.5, this.camera.zoom * factor));
        touchDist = dist;
      }
    });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  setNodes(items, projected3D) {
    this.nodes = items.map((item, idx) => {
      const pos = projected3D[idx] || [0, 0, 0];
      const existing = this.nodes.find(n => n.id === item.id);
      return {
        id: item.id,
        data: item,
        currentPos: existing ? existing.currentPos.slice() : pos.slice(),
        targetPos: pos.slice(),
        screen: { x: 0, y: 0, z: 0, r: 6 }
      };
    });
  }

  setQueryPoint(pos3D, label = 'Query Vector') {
    if (!pos3D) {
      this.queryVectorPoint = null;
      return;
    }
    this.queryVectorPoint = {
      pos: pos3D.slice(),
      label,
      pulsePhase: 0
    };
  }

  setTopKConnections(results, queryPos3D) {
    if (!results || results.length === 0 || !queryPos3D) {
      this.topKConnections = [];
      return;
    }
    this.topKConnections = results.map((res, rank) => {
      const targetNode = this.nodes.find(n => n.id === res.id);
      const cat = CATEGORIES[res.data?.category] || CATEGORIES.ai;
      return {
        targetId: res.id,
        targetNode,
        queryPos: queryPos3D,
        rank: rank + 1,
        distance: res.distance,
        score: res.score,
        color: cat.color
      };
    });
  }

  setGraphEdges(edges) {
    this.graphEdges = edges;
  }

  setCentroids(centroids3D) {
    this.centroids = centroids3D.map((c, i) => ({
      pos: c,
      color: Object.values(CATEGORIES)[i % Object.keys(CATEGORIES).length].color,
      radius: 40
    }));
  }

  resetCamera() {
    this.camera.rotX = 0.35;
    this.camera.rotY = 0.65;
    this.camera.zoom = 1.0;
    this.camera.panX = 0;
    this.camera.panY = 0;
  }

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (node.screen && node.screen.z > 0) {
        const dx = x - node.screen.x;
        const dy = y - node.screen.y;
        if (dx * dx + dy * dy <= (node.screen.r + 6) * (node.screen.r + 6)) {
          return node;
        }
      }
    }
    return null;
  }

  checkHover(x, y) {
    const prev = this.hoveredNode;
    this.hoveredNode = this.findNodeAt(x, y);
    if (this.hoveredNode !== prev) {
      this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'default';
      if (this.onHover) this.onHover(this.hoveredNode ? this.hoveredNode.data : null);
    }
  }

  project3DTo2D(point) {
    const cosY = Math.cos(this.camera.rotY);
    const sinY = Math.sin(this.camera.rotY);
    const cosX = Math.cos(this.camera.rotX);
    const sinX = Math.sin(this.camera.rotX);

    // Rotate around Y axis
    let x1 = point[0] * cosY - point[2] * sinY;
    let y1 = point[1];
    let z1 = point[0] * sinY + point[2] * cosY;

    // Rotate around X axis
    let x2 = x1;
    let y2 = y1 * cosX - z1 * sinX;
    let z2 = y1 * sinX + z1 * cosX;

    // Apply zoom & perspective
    const distance = 420;
    const scale = (this.camera.fov / (distance + z2)) * this.camera.zoom;

    const screenX = this.width / 2 + this.camera.panX + x2 * scale;
    const screenY = this.height / 2 + this.camera.panY + y2 * scale;

    return {
      x: screenX,
      y: screenY,
      z: distance + z2,
      scale
    };
  }

  animate() {
    requestAnimationFrame(this.animate);

    if (this.autoRotate && !this.isDragging) {
      this.camera.rotY += 0.003;
    }

    // Smooth position interpolation
    for (const node of this.nodes) {
      for (let d = 0; d < 3; d++) {
        node.currentPos[d] += (node.targetPos[d] - node.currentPos[d]) * 0.12;
      }
    }

    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw 3D Grid & Coordinate Frame
    if (this.showGrid) {
      this.drawGrid();
    }

    // 2. Draw IVF Voronoi Centroids & Hulls
    if (this.showVoronoi && this.centroids.length > 0) {
      this.drawVoronoiCentroids();
    }

    // 3. Draw HNSW Graph Edges
    if (this.showHnswEdges && this.graphEdges.length > 0) {
      this.drawGraphEdges();
    }

    // 4. Sort and project nodes by Z depth (painter's algorithm)
    const projectedNodes = this.nodes.map(node => {
      const proj = this.project3DTo2D(node.currentPos);
      node.screen = {
        x: proj.x,
        y: proj.y,
        z: proj.z,
        r: Math.max(3, Math.min(14, 6 * proj.scale))
      };
      return node;
    }).filter(n => n.screen.z > 20);

    projectedNodes.sort((a, b) => b.screen.z - a.screen.z);

    // 5. Draw Top-K Connection Rays from Query Vector
    if (this.topKConnections.length > 0 && this.queryVectorPoint) {
      this.drawTopKRays();
    }

    // 6. Draw Nodes
    for (const node of projectedNodes) {
      this.drawNode(node);
    }

    // 7. Draw Query Vector Point
    if (this.queryVectorPoint) {
      this.drawQueryVector();
    }

    // 8. Draw Hovered Tooltip Card
    if (this.hoveredNode && this.hoveredNode.screen) {
      this.drawTooltip(this.hoveredNode);
    }
  }

  drawGrid() {
    const size = 110;
    const step = 22;
    const y = 80;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    // Grid lines on X-Z floor
    for (let x = -size; x <= size; x += step) {
      const p1 = this.project3DTo2D([x, y, -size]);
      const p2 = this.project3DTo2D([x, y, size]);
      if (p1.z > 0 && p2.z > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }

    for (let z = -size; z <= size; z += step) {
      const p1 = this.project3DTo2D([-size, y, z]);
      const p2 = this.project3DTo2D([size, y, z]);
      if (p1.z > 0 && p2.z > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }

    // Origin 3D Axes: X (Red/Cyan), Y (Green), Z (Blue)
    const origin = this.project3DTo2D([0, 0, 0]);
    const axisLen = 45;

    const axes = [
      { pt: [axisLen, 0, 0], color: '#00f3ff', label: 'Dim X' },
      { pt: [0, -axisLen, 0], color: '#10b981', label: 'Dim Y' },
      { pt: [0, 0, axisLen], color: '#8b5cf6', label: 'Dim Z' }
    ];

    for (const ax of axes) {
      const p = this.project3DTo2D(ax.pt);
      if (origin.z > 0 && p.z > 0) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = ax.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.moveTo(origin.x, origin.y);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();

        this.ctx.fillStyle = ax.color;
        this.ctx.font = '10px "JetBrains Mono", monospace';
        this.ctx.fillText(ax.label, p.x + 4, p.y + 4);
      }
    }
  }

  drawGraphEdges() {
    this.ctx.lineWidth = 1;
    for (const edge of this.graphEdges) {
      const sNode = this.nodes.find(n => n.id === edge.source);
      const tNode = this.nodes.find(n => n.id === edge.target);
      if (sNode && tNode) {
        const p1 = this.project3DTo2D(sNode.currentPos);
        const p2 = this.project3DTo2D(tNode.currentPos);
        if (p1.z > 0 && p2.z > 0) {
          const alpha = edge.layer === 0 ? 0.15 : 0.4;
          this.ctx.strokeStyle = edge.layer === 0 ? `rgba(0, 243, 255, ${alpha})` : `rgba(236, 72, 153, ${alpha})`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  drawVoronoiCentroids() {
    for (let i = 0; i < this.centroids.length; i++) {
      const c = this.centroids[i];
      const p = this.project3DTo2D(c.pos);
      if (p.z > 0) {
        // Translucent Voronoi sphere
        const grad = this.ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, c.radius * p.scale);
        grad.addColorStop(0, c.color.replace(')', ', 0.35)').replace('rgb', 'rgba'));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, c.radius * p.scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Centroid marker
        this.ctx.fillStyle = c.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4 * p.scale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px "JetBrains Mono", monospace';
        this.ctx.fillText(`Centroide #${i + 1}`, p.x + 8, p.y - 4);
      }
    }
  }

  drawTopKRays() {
    const qProj = this.project3DTo2D(this.queryVectorPoint.pos);
    if (qProj.z <= 0) return;

    for (const conn of this.topKConnections) {
      if (!conn.targetNode) continue;
      const tProj = this.project3DTo2D(conn.targetNode.currentPos);
      if (tProj.z <= 0) return;

      // Glowing laser ray
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(qProj.x, qProj.y);
      this.ctx.lineTo(tProj.x, tProj.y);
      this.ctx.strokeStyle = conn.color;
      this.ctx.lineWidth = Math.max(1.5, 3.5 - conn.rank * 0.4);
      this.ctx.shadowColor = conn.color;
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
      this.ctx.restore();

      // Mid-point similarity badge
      const midX = (qProj.x + tProj.x) / 2;
      const midY = (qProj.y + tProj.y) / 2;

      this.ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
      this.ctx.strokeStyle = conn.color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(midX - 22, midY - 10, 44, 18, 4);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = conn.color;
      this.ctx.font = 'bold 9px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${(conn.score * 100).toFixed(0)}%`, midX, midY + 3);
      this.ctx.textAlign = 'start';
    }
  }

  drawNode(node) {
    const cat = CATEGORIES[node.data.category] || CATEGORIES.ai;
    const isSelected = this.selectedNode && this.selectedNode.id === node.id;
    const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
    const radius = node.screen.r;

    // Glowing Halo for selected or hovered
    if (isSelected || isHovered) {
      this.ctx.beginPath();
      this.ctx.arc(node.screen.x, node.screen.y, radius + (isSelected ? 6 : 4), 0, Math.PI * 2);
      this.ctx.fillStyle = cat.glow;
      this.ctx.shadowColor = cat.color;
      this.ctx.shadowBlur = 16;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // Core Sphere
    const grad = this.ctx.createRadialGradient(
      node.screen.x - radius * 0.3,
      node.screen.y - radius * 0.3,
      radius * 0.1,
      node.screen.x,
      node.screen.y,
      radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, cat.color);
    grad.addColorStop(1, '#050814');

    this.ctx.beginPath();
    this.ctx.arc(node.screen.x, node.screen.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    // Node Outline
    this.ctx.strokeStyle = isSelected ? '#ffffff' : cat.color;
    this.ctx.lineWidth = isSelected ? 2 : 1;
    this.ctx.stroke();

    // Label if close enough or selected
    if (radius > 5 || isSelected || isHovered) {
      this.ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
      this.ctx.font = `${Math.max(10, Math.min(13, radius * 1.5))}px "Outfit", sans-serif`;
      this.ctx.fillText(node.data.label, node.screen.x + radius + 5, node.screen.y + 4);
    }
  }

  drawQueryVector() {
    const proj = this.project3DTo2D(this.queryVectorPoint.pos);
    if (proj.z <= 0) return;

    this.queryVectorPoint.pulsePhase = (this.queryVectorPoint.pulsePhase + 0.05) % (Math.PI * 2);
    const pulse = Math.sin(this.queryVectorPoint.pulsePhase) * 6;

    // Expanding beacon rings
    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 18;

    this.ctx.beginPath();
    this.ctx.arc(proj.x, proj.y, 14 * proj.scale + pulse, 0, Math.PI * 2);
    this.ctx.stroke();

    // Target crosshair
    const r = 8 * proj.scale;
    this.ctx.fillStyle = '#ff0055';
    this.ctx.beginPath();
    this.ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 11px "Outfit", sans-serif';
    this.ctx.fillText(`🎯 ${this.queryVectorPoint.label}`, proj.x + r + 6, proj.y - 6);
    this.ctx.restore();
  }

  drawTooltip(node) {
    const cat = CATEGORIES[node.data.category] || CATEGORIES.ai;
    const pad = 12;
    const boxW = 220;
    const boxH = 75;
    let x = node.screen.x + 15;
    let y = node.screen.y - 40;

    // Keep within canvas bounds
    if (x + boxW > this.width) x = node.screen.x - boxW - 15;
    if (y < 10) y = 15;
    if (y + boxH > this.height) y = this.height - boxH - 10;

    // Background Card Glass
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 15, 29, 0.92)';
    this.ctx.strokeStyle = cat.color;
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    this.ctx.shadowBlur = 12;

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, boxW, boxH, 8);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    // Text Header
    this.ctx.fillStyle = cat.color;
    this.ctx.font = 'bold 12px "Outfit", sans-serif';
    this.ctx.fillText(node.data.label, x + pad, y + 20);

    // Category Tag
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '10px "JetBrains Mono", monospace';
    this.ctx.fillText(cat.name.toUpperCase(), x + pad, y + 36);

    // Description snippet
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.font = '10px "Outfit", sans-serif';
    const desc = node.data.description.length > 38 ? node.data.description.slice(0, 38) + '...' : node.data.description;
    this.ctx.fillText(desc, x + pad, y + 56);
  }
}
