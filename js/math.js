// Utility math functions for continuous space
export function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
}

// Pseudo-random generator with seed
export class PRNG {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        return this.seed = this.seed * 16807 % 2147483647;
    }

    nextFloat() {
        return (this.next() - 1) / 2147483646;
    }

    nextInt(min, max) {
        return Math.floor(this.nextFloat() * (max - min + 1)) + min;
    }
}

// Line segment intersection with circle
export function lineIntersectsCircle(p1, p2, center, radius) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx*dx + dy*dy;
    let t = 0;
    
    if (lenSq > 0) {
        t = ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
    }
    
    const closestX = p1.x + t * dx;
    const closestY = p1.y + t * dy;
    
    const distX = center.x - closestX;
    const distY = center.y - closestY;
    
    return (distX*distX + distY*distY) < (radius * radius);
}

// Line segment intersection with AABB (Rectangle)
export function lineIntersectsRect(p1, p2, rx, ry, rw, rh) {
    // Check if either point is inside
    if (pointInRect(p1, rx, ry, rw, rh) || pointInRect(p2, rx, ry, rw, rh)) return true;

    // Check intersection with all 4 segments of rectangle
    const tl = {x: rx, y: ry};
    const tr = {x: rx + rw, y: ry};
    const bl = {x: rx, y: ry + rh};
    const br = {x: rx + rw, y: ry + rh};

    return lineIntersectsLine(p1, p2, tl, tr) ||
           lineIntersectsLine(p1, p2, tr, br) ||
           lineIntersectsLine(p1, p2, br, bl) ||
           lineIntersectsLine(p1, p2, bl, tl);
}

function pointInRect(p, rx, ry, rw, rh) {
    return p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh;
}

function lineIntersectsLine(p1, p2, p3, p4) {
    const det = (p2.x - p1.x) * (p4.y - p3.y) - (p4.x - p3.x) * (p2.y - p1.y);
    if (det === 0) return false;
    const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
    const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}
