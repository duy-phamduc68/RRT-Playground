import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle

# -----------------------------
# Simple RRT pseudocode demo
# -----------------------------

np.random.seed(42)

# Existing tree nodes
nodes = np.array([
    [1.0, 1.0],
    [2.0, 1.8],
    [2.8, 2.7],
    [3.6, 3.2],
    [4.2, 4.4],
    [5.0, 5.2]
])

# Tree edges (parent -> child)
edges = [
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 4),
    (4, 5)
]

# Random sample
x_rand = np.array([8.5, 7.0])

# Nearest neighbor
distances = np.linalg.norm(nodes - x_rand, axis=1)
near_idx = np.argmin(distances)
x_near = nodes[near_idx]

# Steering
eta = 2.0

direction = x_rand - x_near
direction = direction / np.linalg.norm(direction)

x_new = x_near + eta * direction

# -----------------------------
# Helper functions
# -----------------------------

def draw_tree(ax):
    # Draw edges
    for i, j in edges:
        p1 = nodes[i]
        p2 = nodes[j]
        ax.plot(
            [p1[0], p2[0]],
            [p1[1], p2[1]],
            linewidth=2
        )

    # Draw nodes
    ax.scatter(
        nodes[:, 0],
        nodes[:, 1],
        s=60
    )

def setup_ax(ax, title):
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    ax.set_title(title, fontsize=12)
    ax.set_xlabel("x")
    ax.set_ylabel("y")

# -----------------------------
# Create figure
# -----------------------------

fig, axs = plt.subplots(2, 2, figsize=(12, 10))

# =========================================================
# Panel 1 — Sampling
# =========================================================
ax = axs[0, 0]

draw_tree(ax)

ax.scatter(
    x_rand[0],
    x_rand[1],
    s=120,
    marker='*',
    label=r"$x_{rand}$"
)

ax.annotate(
    r"$x_{rand}$",
    xy=x_rand,
    xytext=(x_rand[0] - 1.2, x_rand[1] + 0.5),
    arrowprops=dict(arrowstyle="->")
)

setup_ax(ax, "1. Random Sampling")
ax.legend()

# =========================================================
# Panel 2 — Nearest Neighbor
# =========================================================
ax = axs[1, 0]

draw_tree(ax)

# Draw sample
ax.scatter(
    x_rand[0],
    x_rand[1],
    s=120,
    marker='*',
    label=r"$x_{rand}$"
)

# Highlight nearest node
ax.scatter(
    x_near[0],
    x_near[1],
    s=180,
    edgecolors='black',
    linewidths=2,
    label=r"$x_{near}$"
)

# Dashed search connection
ax.plot(
    [x_near[0], x_rand[0]],
    [x_near[1], x_rand[1]],
    linestyle='--',
    linewidth=2
)

ax.annotate(
    r"$x_{near}$",
    xy=x_near,
    xytext=(x_near[0] - 1.2, x_near[1] - 1.0),
    arrowprops=dict(arrowstyle="->")
)

setup_ax(ax, "2. Nearest Neighbor Search")
ax.legend()

# =========================================================
# Panel 3 — Steering
# =========================================================
ax = axs[0, 1]

draw_tree(ax)

# Draw sample
ax.scatter(
    x_rand[0],
    x_rand[1],
    s=120,
    marker='*',
    label=r"$x_{rand}$"
)

# Draw nearest node
ax.scatter(
    x_near[0],
    x_near[1],
    s=180,
    edgecolors='black',
    linewidths=2,
    label=r"$x_{near}$"
)

# Steering line
ax.plot(
    [x_near[0], x_rand[0]],
    [x_near[1], x_rand[1]],
    linestyle='--',
    linewidth=1.5
)

# Draw eta radius
eta_circle = Circle(
    x_near,
    eta,
    fill=False,
    linestyle=':',
    linewidth=2
)

ax.add_patch(eta_circle)

# Draw x_new
ax.scatter(
    x_new[0],
    x_new[1],
    s=120,
    marker='s',
    label=r"$x_{new}$"
)

# Steering edge
ax.plot(
    [x_near[0], x_new[0]],
    [x_near[1], x_new[1]],
    linewidth=3
)

ax.annotate(
    r"$\eta$",
    xy=(x_near[0] + eta, x_near[1]),
    xytext=(x_near[0] + eta + 0.3, x_near[1] + 0.3)
)

setup_ax(ax, "3. Steering Function")
ax.legend()

# =========================================================
# Panel 4 — Collision Free Addition
# =========================================================
ax = axs[1, 1]

draw_tree(ax)

# Existing sample and nodes
ax.scatter(
    x_rand[0],
    x_rand[1],
    s=120,
    marker='*',
    label=r"$x_{rand}$"
)

ax.scatter(
    x_near[0],
    x_near[1],
    s=180,
    edgecolors='black',
    linewidths=2,
    label=r"$x_{near}$"
)

# New node
ax.scatter(
    x_new[0],
    x_new[1],
    s=140,
    marker='s',
    label=r"$x_{new}$"
)

# Permanent edge
ax.plot(
    [x_near[0], x_new[0]],
    [x_near[1], x_new[1]],
    linewidth=4
)

# Collision-free annotation
mid = (x_near + x_new) / 2

ax.text(
    mid[0] + 0.2,
    mid[1],
    "collision-free",
    fontsize=10
)

setup_ax(ax, "4. Add New Edge to Tree")
ax.legend()

# -----------------------------
# Final layout
# -----------------------------

fig.suptitle(
    "Rapidly-exploring Random Tree (RRT) Step-by-Step Visualization",
    fontsize=16
)

plt.tight_layout()
plt.show()