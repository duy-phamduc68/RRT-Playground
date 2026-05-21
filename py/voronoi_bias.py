import numpy as np
import matplotlib.pyplot as plt
from scipy.spatial import Voronoi, voronoi_plot_2d
from matplotlib.collections import PolyCollection
from shapely.geometry import Polygon, box
from collections import defaultdict

# ============================================================
# Generate a partially-grown RRT-like point distribution
# ============================================================

np.random.seed(7)

# Dense central cluster
center = np.array([5.0, 5.0])

cluster_points = center + np.random.normal(
    scale=0.7,
    size=(45, 2)
)

# Frontier / exploration points
angles = np.linspace(0, 2*np.pi, 14, endpoint=False)

frontier_points = []

for a in angles:
    r = np.random.uniform(2.8, 4.5)

    p = center + np.array([
        r * np.cos(a),
        r * np.sin(a)
    ])

    p += np.random.normal(scale=0.25, size=2)

    frontier_points.append(p)

frontier_points = np.array(frontier_points)

# Combine points
points = np.vstack([cluster_points, frontier_points])

# Keep points inside workspace
points = np.clip(points, 0.5, 9.5)

# ============================================================
# Build Voronoi diagram
# ============================================================

vor = Voronoi(points)

# Workspace boundary
bbox = box(0, 0, 10, 10)

# ============================================================
# Convert infinite Voronoi regions to finite polygons
# ============================================================

def voronoi_finite_polygons_2d(vor, radius=100):

    new_regions = []
    new_vertices = vor.vertices.tolist()

    center = vor.points.mean(axis=0)

    all_ridges = defaultdict(list)

    for (p1, p2), (v1, v2) in zip(
        vor.ridge_points,
        vor.ridge_vertices
    ):
        all_ridges[p1].append((p2, v1, v2))
        all_ridges[p2].append((p1, v1, v2))

    for p1, region_index in enumerate(vor.point_region):

        vertices = vor.regions[region_index]

        if all(v >= 0 for v in vertices):
            new_regions.append(vertices)
            continue

        ridges = all_ridges[p1]
        new_region = [v for v in vertices if v >= 0]

        for p2, v1, v2 in ridges:

            if v2 < 0:
                v1, v2 = v2, v1

            if v1 >= 0:
                continue

            tangent = vor.points[p2] - vor.points[p1]
            tangent /= np.linalg.norm(tangent)

            normal = np.array([
                -tangent[1],
                tangent[0]
            ])

            midpoint = vor.points[[p1, p2]].mean(axis=0)

            direction = np.sign(
                np.dot(midpoint - center, normal)
            ) * normal

            far_point = vor.vertices[v2] + direction * radius

            new_region.append(len(new_vertices))
            new_vertices.append(far_point.tolist())

        vs = np.asarray([new_vertices[v] for v in new_region])

        c = vs.mean(axis=0)

        angles = np.arctan2(
            vs[:, 1] - c[1],
            vs[:, 0] - c[0]
        )

        new_region = np.array(new_region)[np.argsort(angles)]

        new_regions.append(new_region.tolist())

    return new_regions, np.asarray(new_vertices)

regions, vertices = voronoi_finite_polygons_2d(vor)

# ============================================================
# Compute polygon areas
# ============================================================

polygons = []
areas = []

for region in regions:

    polygon = vertices[region]

    poly = Polygon(polygon)

    # Clip to workspace boundary
    poly = poly.intersection(bbox)

    polygons.append(poly)

    areas.append(poly.area)

areas = np.array(areas)

# Normalize areas for brightness
norm_areas = (areas - areas.min()) / (
    areas.max() - areas.min()
)

# ============================================================
# Build a simple tree structure (fake RRT edges)
# ============================================================

edges = []

for i in range(1, len(points)):

    # connect each node to nearest previous node
    previous = points[:i]

    dists = np.linalg.norm(
        previous - points[i],
        axis=1
    )

    parent = np.argmin(dists)

    edges.append((parent, i))

# ============================================================
# Plot
# ============================================================

fig, ax = plt.subplots(figsize=(11, 10))

# Draw Voronoi cells
patches = []
colors = []

for poly, intensity in zip(polygons, norm_areas):

    if poly.is_empty:
        continue

    x, y = poly.exterior.xy

    coords = np.vstack([x, y]).T

    patches.append(coords)

    colors.append(intensity)

collection = PolyCollection(
    patches,
    array=np.array(colors),
    cmap='inferno',
    edgecolors='none',
    alpha=0.92
)

ax.add_collection(collection)

# Draw RRT tree edges
for i, j in edges:

    p1 = points[i]
    p2 = points[j]

    ax.plot(
        [p1[0], p2[0]],
        [p1[1], p2[1]],
        linewidth=1.2,
        color='black',
        zorder=3
    )

# Draw nodes
ax.scatter(
    points[:, 0],
    points[:, 1],
    s=45,
    color='black',
    edgecolors='white',
    linewidths=0.5,
    zorder=4
)

# ============================================================
# Formatting
# ============================================================

ax.set_xlim(0, 10)
ax.set_ylim(0, 10)

ax.set_aspect('equal')

ax.set_xlabel("x", fontsize=16)
ax.set_ylabel("y", fontsize=16)

ax.set_title(
    "Voronoi Diagram of a Partially Grown RRT",
    fontsize=24,
    pad=20
)

# Colorbar
cbar = plt.colorbar(collection, ax=ax, shrink=0.82)

cbar.ax.set_title(
    "Voronoi\nCell Area\n(relative)",
    fontsize=13,
    pad=14
)

cbar.set_ticks([0, 1])
cbar.set_ticklabels(["Low", "High"])

# Caption
caption = (
    "Brightness represents the relative area of each Voronoi cell.\n"
    "Brighter cells have a higher probability of a uniform random "
    "sample falling inside them (Voronoi bias)."
)

fig.text(
    0.5,
    0.035,
    caption,
    ha='center',
    fontsize=15,
    style='italic'
)

plt.tight_layout(rect=[0, 0.07, 1, 1])

plt.show()