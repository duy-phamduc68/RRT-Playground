import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle

# ============================================================
# Redesigned RRT* Tree: Demonstrating True Asymptotic Optimality
# ============================================================

# Nodes forming a highly suboptimal "hook" or loop structure
nodes = np.array([
    [1.0, 2.0],   # 0: Root
    [2.5, 3.5],   # 1: Main stem
    [4.0, 5.0],   # 2: Peak of the obstacle bypass
    [6.0, 5.5],   # 3: Inefficient extension right
    [7.5, 4.5],   # 4: Winding down...
    [7.0, 2.8],   # 5: Highly suboptimal leaf 1 (Target for rewiring)
    [5.5, 2.0]    # 6: Highly suboptimal leaf 2 (Target for rewiring)
])

edges = [
    (0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6)
]

# Strategic placement of x_new: breaks the massive detour open
x_new = np.array([4.2, 2.8])
radius = 2.5

parent_map = {c: p for p, c in edges}

def cost_to_root(idx):
    cost = 0.0
    current = idx
    while current != 0:
        parent = parent_map[current]
        cost += np.linalg.norm(nodes[current] - nodes[parent])
        current = parent
    return cost

# Compute distances and find neighbors
distances = np.linalg.norm(nodes - x_new, axis=1)
near_indices = np.where(distances <= radius)[0]
X_near = nodes[near_indices]

# Panel 2: Select optimal parent for x_new
candidate_costs = []
for idx in near_indices:
    cost = cost_to_root(idx) + np.linalg.norm(nodes[idx] - x_new)
    candidate_costs.append(cost)

best_idx = near_indices[np.argmin(candidate_costs)]
x_best = nodes[best_idx]
c_new = np.min(candidate_costs)

# Panel 3: Dynamic Check for True Rewiring (Where routing through x_new is strictly better)
rewired_targets = []
for idx in near_indices:
    if idx == best_idx:
        continue
    potential_cost = c_new + np.linalg.norm(nodes[idx] - x_new)
    if potential_cost < cost_to_root(idx):
        rewired_targets.append(idx)

# Master Plotting Tools
def draw_base_tree(ax, fade_edges=None):
    if fade_edges is None:
        fade_edges = []
    for edge in edges:
        i, j = edge
        if edge in fade_edges:
            ax.plot([nodes[i][0], nodes[j][0]], [nodes[i][1], nodes[j][1]],
                    linestyle='--', linewidth=2, color='tomato', alpha=0.35, zorder=1)
        else:
            ax.plot([nodes[i][0], nodes[j][0]], [nodes[i][1], nodes[j][1]],
                    linewidth=2.5, color='tab:blue', zorder=1)
    ax.scatter(nodes[:, 0], nodes[:, 1], s=45, color='black', zorder=3)

def setup_canvas(ax, title):
    ax.set_xlim(0, 9)
    ax.set_ylim(0, 7)
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.15)
    ax.set_xlabel("x", fontsize=10)
    ax.set_ylabel("y", fontsize=10)
    ax.set_title(title, fontsize=12, pad=12, fontweight='bold')

# ============================================================
# Build Figure Canvas
# ============================================================
fig, axs = plt.subplots(1, 3, figsize=(18, 6.5))

# --- Panel 1: Clearly defined neighborhood search ---
ax = axs[0]
draw_base_tree(ax)
ax.add_patch(Circle(x_new, radius, fill=False, linestyle='--', linewidth=2, color='tab:green', alpha=0.7))

ax.scatter(X_near[:, 0], X_near[:, 1], s=140, color='gold', edgecolors='black', linewidths=1.2, label=r"$X_{near}$", zorder=5)
ax.scatter(x_new[0], x_new[1], s=150, marker='s', color='limegreen', edgecolors='black', linewidths=1.2, label=r"$x_{new}$", zorder=6)

ax.annotate(r"$x_{new}$", xy=x_new, xytext=(x_new[0] - 0.9, x_new[1] - 0.8),
            fontsize=11, fontweight='bold', arrowprops=dict(arrowstyle="->", color='black', lw=1.2))

setup_canvas(ax, "1. Identify Neighborhood ($X_{near}$)")
ax.legend(loc='lower left', framealpha=0.9)


# --- Panel 2: Finding the absolute best parent path ---
ax = axs[1]
draw_base_tree(ax)

# Draw candidate evaluations
for idx in near_indices:
    p = nodes[idx]
    ax.plot([p[0], x_new[0]], [p[1], x_new[1]], linestyle=':', linewidth=1.5, color='gray', alpha=0.7, zorder=2)

ax.plot([x_best[0], x_new[0]], [x_best[1], x_new[1]], linewidth=4, color='tab:green', zorder=4)
ax.scatter(x_best[0], x_best[1], s=140, color='gold', edgecolors='black', linewidths=1.2, label="min-cost parent", zorder=5)
ax.scatter(x_new[0], x_new[1], s=150, marker='s', color='limegreen', edgecolors='black', linewidths=1.2, zorder=6)

# Updated explicit textual offsets to display total path cost cleanly
# Format: node_idx: (dx, dy, horizontal_alignment, vertical_alignment)
text_offsets = {
    1: (-0.3, -0.3, 'right', 'top'),
    5: (0.3, 0.1, 'left', 'bottom'),
    6: (-0.1, -0.4, 'center', 'top')
}

for idx, total_cost in zip(near_indices, candidate_costs):
    p = nodes[idx]
    midpoint = (p + x_new) / 2
    
    # Safely extract values with structural positional alignment
    dx, dy, ha, va = text_offsets.get(idx, (0.1, 0.1, 'left', 'bottom'))
    
    ax.text(midpoint[0] + dx, midpoint[1] + dy, f"c={total_cost:.1f}", 
            fontsize=9.5, weight='bold', color='darkslategray', ha=ha, va=va, zorder=7)

setup_canvas(ax, "2. Optimal Connection to Tree")
ax.legend(loc='lower left', framealpha=0.9)


# --- Panel 3: Dynamic Cascade Rewire Execution ---
ax = axs[2]

# Determine which existing branches are broken by our optimal shortcut
faded = [(parent_map[t], t) for t in rewired_targets]
draw_base_tree(ax, fade_edges=faded)

# Plot unbroken parent line safely beneath structural components
ax.plot([x_best[0], x_new[0]], [x_best[1], x_new[1]], linewidth=2.5, color='tab:blue', zorder=2)

# Draw rewired shortcuts cleanly bridging nodes over the gap
for t in rewired_targets:
    ax.plot([x_new[0], nodes[t][0]], [x_new[1], nodes[t][1]], linewidth=4, color='tab:orange', zorder=4)
    ax.scatter(nodes[t][0], nodes[t][1], s=140, color='darkorange', edgecolors='black', linewidths=1.2, zorder=5)

# Single explicit entry for the legend clean setup
ax.scatter([], [], s=140, color='darkorange', edgecolors='black', linewidths=1.2, label="rewired node")
ax.scatter(x_new[0], x_new[1], s=150, marker='s', color='limegreen', edgecolors='black', linewidths=1.2, label=r"$x_{new}$", zorder=6)

# Trace the dramatic shortcut tracking down to the bottom node cascade
ax.annotate("Optimized shortcut\nbypasses detour!", xy=((x_new + nodes[6]) / 2), xytext=(x_new[0] + 1.2, x_new[1] - 0.8),
            fontsize=10, weight='bold', color='darkorange', arrowprops=dict(arrowstyle="->", color='darkorange', lw=1.6))

setup_canvas(ax, "3. Asymptotic Rewiring Optimization")
ax.legend(loc='lower left', framealpha=0.9)

# Master Layout Configs
fig.suptitle("RRT* Global Optimization via Neighborhood Rewiring", fontsize=15, fontweight='bold', y=0.98)
plt.subplots_adjust(wspace=0.18, top=0.85, bottom=0.15)
plt.show()