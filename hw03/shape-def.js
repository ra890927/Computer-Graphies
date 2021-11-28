cube_vertices = [
    1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, //front
    1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, //right
    1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, //up
    -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, //left
    -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0,  1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, //bottom
    1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0 //back
]

ball_vertices = () => {
    // suppose that ball is consist of many squares
    // and there are many vertical circles make up a ball
    // in the words, the adjacent circle represent letf and right of a square on a ball

    const R = 1;
    var vertices = [];
    for(let out_angle = 0; out_angle < 360; out_angle += 3){
        let right_zdirection = R * Math.sin(out_angle * Math.PI / 180);
        let left_zdirection = R * Math.sin((out_angle + 3) * Math.PI / 180);
        let right_proj_radius = Math.abs(R * Math.cos(out_angle * Math.PI / 180));
        let left_prog_radius = Math.abs(R * Math.cos((out_angle + 3) * Math.PI / 180));

        for(let in_angle = 0; in_angle < 360; in_angle += 3){
            // the right bottom vertice
            let right_bottom_x = right_proj_radius * Math.cos(in_angle * Math.PI / 180);
            let right_bottom_y = right_proj_radius * Math.sin(in_angle * Math.PI / 180);

            // the right top vertice
            let right_top_x = right_proj_radius * Math.cos((in_angle + 3) * Math.PI / 180);
            let right_top_y = right_proj_radius * Math.sin((in_angle + 3) * Math.PI / 180);

            // the left bottom vertice
            let left_bottom_x = left_prog_radius * Math.cos(in_angle * Math.PI / 180);
            let left_bottom_y = left_prog_radius * Math.sin(in_angle * Math.PI / 180);

            // the left top vertice
            let left_top_x = left_prog_radius * Math.cos((in_angle + 3) * Math.PI / 180);
            let left_top_y = left_prog_radius * Math.sin((in_angle + 3) * Math.PI / 180);

            vertices = vertices.concat([
                left_top_x, left_top_y, left_zdirection,
                right_top_x, right_top_y, right_zdirection,
                left_bottom_x, left_bottom_y, left_zdirection,
                right_top_x, right_top_y, right_zdirection,
                left_bottom_x, left_bottom_y, left_zdirection,
                right_bottom_x, right_bottom_y, right_zdirection
            ]);
        }
    }

    return vertices;
}

cylinder_vertices = () => {
    const R = 1;
    var vertices = [];
    for(let angle = 0; angle < 360; angle += 3){
        let left_x = R * Math.cos(angle * Math.PI / 180);
        let left_y = R * Math.sin(angle * Math.PI / 180);

        let right_x = R * Math.cos((angle + 3) * Math.PI / 180);
        let right_y = R * Math.sin((angle + 3) * Math.PI / 180);

        vertices = vertices.concat([
            // top circle
            0, 0, 1,
            left_x, left_y, 1,
            right_x, right_y, 1,

            // side rectangle
            left_x, left_y, 1,
            right_x, right_y, 1,
            left_x, left_y, -1,
            right_x, right_y, 1,
            left_x, left_y, -1,
            right_x, right_y, -1,

            // bottom circle
            0, 0, -1,
            left_x, left_y, -1,
            right_x, right_y, -1,
        ])
    }

    return vertices;
}

pyramid_vertices = [
    0, 1, 0, -1, -1, 1, 1, -1, 1,
    0, 1, 0, 1, -1, 1, 1, -1, -1,
    0, 1, 0, 1, -1, -1, -1, -1, -1,
    0, 1, 0, -1, -1, -1, -1, -1, 1,
    -1, -1, 1, 1, -1, 1, 1, -1, -1,
    -1, -1, 1, 1, -1, -1, -1, -1, -1
]