import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle

# ============================================================
# RRT Step-by-Step Visualization
# Cleaned version:
# - branching tree
# - obstacles
# - no near-collision obstacle in panel 4
# - removed "collision-free edge" label
# ============================================================

np.random.seed(8)

# ============================================================
# Tree nodes
# ============================================================

nodes = np.array([
    [1.0, 1.0],
    [1.8, 1.7],
    [2.5, 2.5],
    [3.4, 3.0],
    [4.3, 3.8],
    [5.2, 4.6],
    [3.0, 4.2],
    [2.2, 5.3],
    [4.1, 5.0],
    [5.0, 5.8],
    [6.0, 6.2],
    [6.5, 4.0],
])

edges = [
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 4),
    (4, 5),

    (2, 6),
    (6, 7),

    (4, 8),
    (8, 9),
    (9, 10),

    (5, 11)
]

# ============================================================
# Obstacles
# ============================================================

# Removed the obstacle near the goal region
obstacles = [
    Rectangle((2.8, 1.2), 1.2, 1.4),
    Rectangle((6.6, 2.0), 1.5, 1.5),
    Rectangle((1.2, 6.2), 1.4, 1.1),
]

# ============================================================
# Sampling
# ============================================================

x_rand = np.array([8.5, 7.5])

distances = np.linalg.norm(nodes - x_rand, axis=1)

near_idx = np.argmin(distances)

x_near = nodes[near_idx]

# ============================================================
# Steering
# ============================================================

eta = 1.8

direction = x_rand - x_near
direction = direction / np.linalg.norm(direction)

x_new = x_near + eta * direction

# ============================================================
# Helper functions
# ============================================================

def draw_obstacles(ax):

    for obs in obstacles:

        rect = Rectangle(
            obs.get_xy(),
            obs.get_width(),
            obs.get_height(),
            facecolor='lightgray',
            edgecolor='black',
            linewidth=1.5,
            zorder=1
        )

        ax.add_patch(rect)

def draw_tree(ax):

    # Draw edges
    for i, j in edges:

        p1 = nodes[i]
        p2 = nodes[j]

        ax.plot(
            [p1[0], p2[0]],
            [p1[1], p2[1]],
            linewidth=2,
            color='tab:blue',
            zorder=2
        )

    # Draw nodes
    ax.scatter(
        nodes[:, 0],
        nodes[:, 1],
        s=60,
        color='black',
        zorder=5
    )

def setup_ax(ax, title):

    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)

    ax.set_aspect('equal')

    ax.grid(True, alpha=0.25)

    ax.set_xlabel("x")
    ax.set_ylabel("y")

    ax.set_title(title, fontsize=12, pad=12)

# ============================================================
# Figure
# ============================================================

fig, axs = plt.subplots(2, 2, figsize=(14, 11))

# ============================================================
# Panel 1 — Sampling
# ============================================================

ax = axs[0, 0]

draw_obstacles(ax)
draw_tree(ax)

ax.scatter(
    x_rand[0],
    x_rand[1],
    s=180,
    marker='*',
    color='red',
    label=r"$x_{rand}$",
    zorder=8
)

ax.annotate(
    r"$x_{rand}$",
    xy=x_rand,
    xytext=(7.1, 8.6),
    fontsize=11,
    arrowprops=dict(arrowstyle="->")
)

setup_ax(ax, "1. Random Sampling")

ax.legend(
    loc='lower right',
    framealpha=0.95
)

# ============================================================
# Panel 2 — Nearest Neighbor
# ============================================================

ax = axs[1, 0]

draw_obstacles(ax)
draw_tree(ax)

ax.scatter(
    x_rand[0],
    x_rand[1],
    s=180,
    marker='*',
    color='red',
    label=r"$x_{rand}$",
    zorder=8
)

ax.scatter(
    x_near[0],
    x_near[1],
    s=220,
    facecolors='gold',
    edgecolors='black',
    linewidths=2,
    label=r"$x_{near}$",
    zorder=9
)

ax.plot(
    [x_near[0], x_rand[0]],
    [x_near[1], x_rand[1]],
    linestyle='--',
    linewidth=2,
    color='black'
)

ax.annotate(
    r"$x_{near}$",
    xy=x_near,
    xytext=(5.3, 7.2),
    fontsize=11,
    arrowprops=dict(arrowstyle="->")
)

setup_ax(ax, "2. Nearest Neighbor Search")

ax.legend(
    loc='lower right',
    framealpha=0.95
)

# ============================================================
# Panel 3 — Steering
# ============================================================

ax = axs[0, 1]

draw_obstacles(ax)
draw_tree(ax)

ax.scatter(
    x_rand[0],
    x_rand[1],
    s=180,
    marker='*',
    color='red',
    label=r"$x_{rand}$",
    zorder=8
)

ax.scatter(
    x_near[0],
    x_near[1],
    s=220,
    facecolors='gold',
    edgecolors='black',
    linewidths=2,
    label=r"$x_{near}$",
    zorder=9
)

ax.plot(
    [x_near[0], x_rand[0]],
    [x_near[1], x_rand[1]],
    linestyle='--',
    linewidth=1.5,
    color='black'
)

eta_circle = Circle(
    x_near,
    eta,
    fill=False,
    linestyle=':',
    linewidth=2,
    color='green'
)

ax.add_patch(eta_circle)

ax.scatter(
    x_new[0],
    x_new[1],
    s=170,
    marker='s',
    color='limegreen',
    label=r"$x_{new}$",
    zorder=10
)

ax.plot(
    [x_near[0], x_new[0]],
    [x_near[1], x_new[1]],
    linewidth=3,
    color='green'
)

ax.annotate(
    r"$x_{new}$",
    xy=x_new,
    xytext=(8.0, 5.2),
    fontsize=11,
    arrowprops=dict(arrowstyle="->")
)

ax.annotate(
    r"$\eta$",
    xy=(x_near[0] + eta, x_near[1]),
    xytext=(7.4, 6.3),
    fontsize=11
)

setup_ax(ax, "3. Steering Function")

ax.legend(
    loc='lower left',
    framealpha=0.95
)

# ============================================================
# Panel 4 — Collision Check and Add Edge
# ============================================================

ax = axs[1, 1]

draw_obstacles(ax)
draw_tree(ax)

ax.scatter(
    x_rand[0],
    x_rand[1],
    s=180,
    marker='*',
    color='red',
    label=r"$x_{rand}$",
    zorder=8
)

ax.scatter(
    x_near[0],
    x_near[1],
    s=220,
    facecolors='gold',
    edgecolors='black',
    linewidths=2,
    label=r"$x_{near}$",
    zorder=9
)

ax.scatter(
    x_new[0],
    x_new[1],
    s=170,
    marker='s',
    color='limegreen',
    label=r"$x_{new}$",
    zorder=10
)

# Final added edge
ax.plot(
    [x_near[0], x_new[0]],
    [x_near[1], x_new[1]],
    linewidth=4,
    color='limegreen'
)

ax.annotate(
    "obstacle",
    xy=(7.0, 2.7),
    xytext=(8.2, 4.2),
    fontsize=11,
    arrowprops=dict(arrowstyle="->")
)

setup_ax(ax, "4. Collision Check and Tree Expansion")

ax.legend(
    loc='lower left',
    framealpha=0.95
)

# ============================================================
# Layout
# ============================================================

fig.suptitle(
    "Rapidly-exploring Random Tree (RRT) Step-by-Step Visualization",
    fontsize=18,
    y=0.98
)

plt.subplots_adjust(
    wspace=0.22,
    hspace=0.28
)

plt.show()