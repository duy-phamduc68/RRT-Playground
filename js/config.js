export const defaultConfig = {
    app: {
        default_mode: 'single',
        algorithm: 'rrt',
        randomize_env_seed: false,
        randomize_smp_seed: false
    },
    simulation: {
        env_seed: 42,
        smp_seed: 42,
        max_iterations: 10000,
        iterations_per_frame: 20,
        collision_check_step: 4,
        goal_radius: 20,
        robot_radius: 4
    },
    environment: {
        default_type: 'random_forest',
        default_width: 1000,
        default_height: 1000,
        regenerate_on_reset: true
    },
    random_forest: {
        obstacle_count: 120,
        circle_count: 60,
        rectangle_count: 60,
        circle_radius_min: 12,
        circle_radius_max: 40,
        rectangle_size_min: 20,
        rectangle_size_max: 80,
        allow_overlap: true,
        boundary_margin: 20,
        start_goal_clearance: 60
    },
    maze: {
        rows: 10,
        cols: 10,
        corridor_size: 90,
        wall_thickness: 10,
        extra_loops: 0,
        generation_algorithm: 'recursive_backtracking'
    },
    rendering: {
        draw_grid: true,
        draw_samples: true,
        draw_nodes: false,
        draw_rejected_edges: false,
        tree_edge_width: 1,
        node_radius: 2,
        sample_radius: 3,
        final_path_width: 4,
        show_stats: true,
        show_iteration_count: true,
        show_node_count: true,
        show_path_cost: true
    },
    algorithms: {
        rrt: {
            step_size: 24,
            goal_bias: 0.05,
            terminate_on_first_solution: true
        },
        rrt_star: {
            step_size: 24,
            goal_bias: 0.05,
            rewire_radius: 60,
            optimize_after_first_solution: true,
            optimization_iterations: 3000,
            target_cost: 0
        },
        informed_rrt_star: {
            step_size: 24,
            goal_bias: 0.05,
            rewire_radius: 60,
            optimize_after_first_solution: true,
            optimization_iterations: 3000,
            target_cost: 0
        },
        bit_star: {
            batch_size: 150,
            samples_per_batch: 150,
            rewire_radius: 70,
            prune_threshold: 0.05,
            optimize_after_first_solution: true,
            optimization_iterations: 3000,
            target_cost: 0
        }
    }
};
