import {defs, tiny} from './common.js';
import {Body, Test_Data} from "./collisions-demo.js";
import { Text_Line } from './text-demo.js'



// Pull these names into this module's scope for convenience:
const {vec3, unsafe3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Simulation extends Scene {
    // **Simulation** manages the stepping of simulation time.  Subclass it when making
    // a Scene that is a physics demo.  This technique is careful to totally decouple
    // the simulation from the frame rate (see below).
    constructor() {
        super();
        Object.assign(this, {time_accumulator: 0, time_scale: 1/1000.0, t: 0, dt: 1 / 50, bodies: [], steps_taken: 0});

    }

    simulate(frame_time) {
        // simulate(): Carefully advance time according to Glenn Fiedler's
        // "Fix Your Timestep" blog post.
        // This line gives ourselves a way to trick the simulator into thinking
        // that the display framerate is running fast or slow:
        frame_time = this.time_scale * frame_time;

        // Avoid the spiral of death; limit the amount of time we will spend
        // computing during this timestep if display lags:
        this.time_accumulator += Math.min(frame_time, 0.1);
        // Repeatedly step the simulation until we're caught up with this frame:
        while (Math.abs(this.time_accumulator) >= this.dt) {
            // Single step of the simulation for all bodies:
            this.update_state(this.dt);
            for (let b of this.bodies)
                b.advance(this.dt);
            // Following the advice of the article, de-couple
            // our simulation time from our frame rate:
            this.t += Math.sign(frame_time) * this.dt;
            this.time_accumulator -= Math.sign(frame_time) * this.dt;
            this.steps_taken++;
        }
        // Store an interpolation factor for how close our frame fell in between
        // the two latest simulation time steps, so we can correctly blend the
        // two latest states and display the result.
        let alpha = this.time_accumulator / this.dt;
        for (let b of this.bodies) b.blend_state(alpha);
    }

    make_control_panel() {
        // make_control_panel(): Create the buttons for interacting with simulation time.
        //this.key_triggered_button("Speed up time", ["Shift", "T"], () => this.time_scale *= 5);
        //this.key_triggered_button("Slow down time", ["t"], () => this.time_scale /= 5);
        this.new_line();
        this.live_string(box => {
            box.textContent = "Time scale: " + this.time_scale
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = "Fixed simulation time step size: " + this.dt
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = this.steps_taken + " timesteps were taken so far."
        });

    }

    display(context, program_state) {
        // display(): advance the time and state of our whole simulation.
        if (program_state.animate)
            this.simulate(program_state.animation_delta_time);
        // Draw each shape at its current location:

            for (let b of this.bodies)
                b.shape.draw(context, program_state, b.drawn_location, b.material);

    }

    update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
    {
        throw "Override this"
    }

}

export class Control_Demo extends Simulation {
    // ** Inertia_Demo** demonstration: This scene lets random initial momentums
    // carry several bodies until they fall due to gravity and bounce.
    startGame;
    StartLevel2;
    startLevel3;
    constructor() {
        super();
        this.data = new Test_Data();
        this.shapes = Object.assign({}, this.data.shapes);
        this.shapes.square = new defs.Square;
        this.shapes.circle = new defs.Subdivision_Sphere(4);
        const shader = new defs.Fake_Bump_Map(1);
        this.shapes.earth = new defs.Cone_Tip(15,15);
        this.shapes.text= new Text_Line(100);
        this.material = new Material(shader, {
                color: color(0, 0, 0, 1),
                ambient: .5, texture: this.data.textures.fruit,
            })
        // The agent
        this.agent = this.shapes.earth;
        this.agent_pos = vec3(0, -11, 5);
        this.agent_size = 4.0;

        this.control = {};
        this.control.w = false;
        this.control.a = false;
        this.control.s = false;
        this.control.d = false;
        this.control.space = false;
        this.collided_number=0;
        this.lives = 5;
        this.catching_Ball_sound = new Audio("assets/ballCatching.wav");
        this.missing_Ball_sound = new Audio("assets/missingBall.wav");
        this.endGame = false;
        this.endChange = false;
        this.endChange2=false;
        this.body_length =1;


    }

    random_color() {
        return this.material.override(color(.6, .6 * Math.random(), 0 * Math.random(), 1));
    }

    make_control_panel() {
        super.make_control_panel();
        this.new_line();
        /*this.key_triggered_button("Foward", ["Shift", "W"],
            () => this.control.w = true, '#6E6460', () => this.control.w = false);
        this.key_triggered_button("Back",   ["Shift", "S"],
            () => this.control.s = true, '#6E6460', () => this.control.s = false);
        this.key_triggered_button("Left",   ["Shift", "A"],
            () => this.control.a = true, '#6E6460', () => this.control.a = false);
        this.key_triggered_button("Right",  ["Shift", "D"],
            () => this.control.d = true, '#6E6460', () => this.control.d = false);*/
        this.key_triggered_button("Left",   ["ArrowLeft"],
            () => this.control.a = true, '#6E6460', () => this.control.a = false);
        this.key_triggered_button("Right",  ["ArrowRight"],
            () => this.control.d = true, '#6E6460', () => this.control.d = false);
        //this.key_triggered_button("Speed Up",  ["shift","t"],
           // () => this.control.space = true, '#6E6460', () => this.control.space = false);
        this.key_triggered_button("StartGame",["Enter"],()=>{this.startGame^=1});
        this.key_triggered_button("startLevel2",["n"],()=>{this.StartLevel2^=1});
        this.key_triggered_button("StartLevel3",["y"],()=>{this.startLevel3^=1});
       // this.key_triggered_button("move left",
    }

    update_state(dt) {
        // update_state():  Override the base time-stepping code to say what this particular
        // scene should do to its bodies every frame -- including applying forces.
        // Generate additional moving bodies if there ever aren't enough:
        if((this.StartLevel2&&!this.endChange))
        {
            //this.body_length=2;
            this.time_scale*=2;
            this.collided_number=0;
            this.lives=5;
            this.endChange=true;

        }
       if(this.startLevel3&&!this.endChange2)
        {
            this.time_scale*=1.1;
            this.collided_number=0;
            this.lives=3;
            this.endChange2=true;
        }
        if(this.startGame&&!this.endGame) {

            while (this.bodies.length < this.body_length)
                this.bodies.push(new Body(this.shapes.circle,this.random_color(), vec3(1, 1 ,1))
                    .emplace(Mat4.translation(...vec3(0, 30, 0).randomizedx(30)),
                        vec3(0, 0, 0).randomized(1).normalized().times(1), Math.random()));
            for (let b of this.bodies) {
                // Gravity on Earth, where 1 unit in world space = 1 meter:
                b.linear_velocity[1] += dt * -9.8;    //-9.8;
                b.center[2]=5;
                let dis = b.center.minus(this.agent_pos);
                if (dis.norm() < this.agent_size) {
                        //b.linear_velocity.add_by(dis.times(dt*98));
                        b.linear_velocity[1] *= -0.0;
                        this.collided_number += 1;
                        this.catching_Ball_sound.play();
                }
                if (b.center[1] <= -8.0&& b.linear_velocity[1] < 0) {
                    b.linear_velocity[1] *= -0.4;
                    this.lives = this.lives - 1;
                    this.missing_Ball_sound.play();
                }

            }
        }

        // Control
        let speed = 10.0;
        if (this.control.space)
            speed *= 3;
        if (this.control.w) {
            this.agent_pos[2] -= dt * speed;
        }
        if (this.control.s) {
            this.agent_pos[2] += dt * speed;
        }
        if (this.control.a) {
            this.agent_pos[0] -= dt * speed;
        }
        if (this.control.d) {
            this.agent_pos[0] += dt * speed;
        }

        // Delete bodies that stop or stray too far away:
        this.bodies = this.bodies.filter(b => b.center.norm() < 40 && (b.linear_velocity.norm() > 4 || b.center[1] >= 0.8));





    }

    display(context, program_state) {
        // display(): Draw everything else in the scene besides the moving bodies.
        let collide_number = 0;

        super.display(context, program_state);



        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            this.children.push(new defs.Program_State_Viewer());
            program_state.set_camera(Mat4.translation(0, -5, -50));    // Locate the camera here (inverted matrix).
        }
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
        program_state.lights = [new Light(vec4(0, -5, -10, 1), color(1, 1, 1, 1), 100000)];
        var collision_number = this.collided_number;
        var live_number = this.lives;
        if(!this.startGame&&!this.StartLevel2)
        {
            this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                ambient: 1,
                texture: this.data.textures.forest
            }));
            let Text_transform =  Mat4.translation(-13, 5, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
            this.shapes.text.set_string("Press 'Enter' to Start Game!", context.context);
            this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                ambient: 1,
                texture: this.data.textures.text}));

        }
        else if (this.startGame && !this.StartLevel2&&!this.startLevel3) {
            this.shapes.square.draw(context, program_state, Mat4.translation(0, -10, -5)
                    .times(Mat4.rotation(Math.PI / 2, 1, 0, 0)).times(Mat4.scale(60, 60, 1)),
                this.material.override({ambient: .8, texture: this.data.textures.ground}));
            this.shapes.square.draw(context, program_state, Mat4.translation(0, 2.5, -20).times(Mat4.scale(60, 50, 1)), this.material.override({
                ambient: 1,
                texture: this.data.textures.background
            }));

            let agent_trans = Mat4.translation(this.agent_pos[0], this.agent_pos[1], this.agent_pos[2])
                .times(Mat4.rotation(45.5, 1, 0, 0)).times(Mat4.scale(this.agent_size, this.agent_size, this.agent_size));
            this.agent.draw(context, program_state, agent_trans, this.material.override({ambient: 0.6,texture:this.data.textures.basket}));
            if (live_number <= 5 && live_number >= 1 && collision_number < 5) {
                let text_trans = Mat4.translation(-22, 15, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Target:" + collision_number.toString() + "/5", context.context);
                this.shapes.text.draw(context, program_state, text_trans, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
                let time_trans = Mat4.translation(-22, 13, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Live::" + live_number.toString() + "/5", context.context);
                this.shapes.text.draw(context, program_state, time_trans, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
            } else if (live_number < 1 && collision_number < 5) {
                this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.forest
                }));
                this.shapes.square.draw(context, program_state, Mat4.translation(-3, 7, 20).times(Mat4.scale(10, 10, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.gameOver
                }));
                this.endGame = true;
            } else if (live_number >= 1 && collision_number >= 5) {
                this.endGame = true;
                this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.forest}));
                let Text_transform = Mat4.translation(-12, 5, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Congratulations!", context.context);
                this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
                Text_transform = Mat4.translation(-15, 3, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Please 'n' to next level!", context.context);
                this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
            }

        }
        if(this.StartLevel2)
        {
           this.endGame=false;
            let live2 = this.lives;
            let collide_number2 = this.collided_number;
            this.shapes.square.draw(context, program_state, Mat4.translation(0, -10, -5)
                    .times(Mat4.rotation(Math.PI / 2, 1, 0, 0)).times(Mat4.scale(60, 60, 1)),
                this.material.override({ambient: .8, texture: this.data.textures.ground}));
            this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, -20).times(Mat4.scale(60, 50, 1)), this.material.override({
                ambient: 1,
                texture: this.data.textures.background
            }));
            let agent_trans = Mat4.translation(this.agent_pos[0], this.agent_pos[1], this.agent_pos[2])
                .times(Mat4.rotation(45.5, 1, 0, 0)).times(Mat4.scale(this.agent_size, this.agent_size, this.agent_size));
            this.agent.draw(context, program_state, agent_trans, this.material.override({ambient: 0.6,texture:this.data.textures.basket}));
            if ( this.lives<=5 && live2>=1&&this.collided_number < 10) {
                let text_trans = Mat4.translation(-22, 15, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Target:" + collision_number.toString() + "/10", context.context);
                this.shapes.text.draw(context, program_state, text_trans, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
                let time_trans = Mat4.translation(-22, 13, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Live::" + live_number.toString() + "/5", context.context);
                this.shapes.text.draw(context, program_state, time_trans, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
            }
            else if (this.lives<1&&this.collided_number<10)
            {
                this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.forest
                }));
                this.shapes.square.draw(context, program_state, Mat4.translation(-3, 7, 20).times(Mat4.scale(10, 10, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.gameOver
                }));
                this.endGame=true;
            }
            else if(this.lives>=1&&this.collided_number>=10)
            {
                this.endGame=true;
                this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.forest
                }));
                let Text_transform =  Mat4.translation(-13, 6, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Congratulation!", context.context);
                this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text}));
                Text_transform =  Mat4.translation(-13, 4, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("press 'y' for last Level!", context.context);
                this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text}));

            }
        }
        if(this.startLevel3)
        {
            this.StartLevel2 = false;
            this.endGame=false;
            this.shapes.square.draw(context, program_state, Mat4.translation(0, -10, -5)
                    .times(Mat4.rotation(Math.PI / 2, 1, 0, 0)).times(Mat4.scale(60, 60, 1)),
                this.material.override({ambient: .8, texture: this.data.textures.ground}));
            this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, -20).times(Mat4.scale(60, 50, 1)), this.material.override({
                ambient: 1,
                texture: this.data.textures.background
            }));
            let agent_trans = Mat4.translation(this.agent_pos[0], this.agent_pos[1], this.agent_pos[2])
                .times(Mat4.rotation(45.5, 1, 0, 0)).times(Mat4.scale(this.agent_size, this.agent_size, this.agent_size));
            this.agent.draw(context, program_state, agent_trans, this.material.override({ambient: 0.6,texture:this.data.textures.basket}));
            if ( this.lives<=3 &&this.lives>=1&&this.collided_number < 10) {
                let text_trans = Mat4.translation(-22, 15, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Target:" + this.collided_number.toString() + "/10", context.context);
                this.shapes.text.draw(context, program_state, text_trans, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
                let time_trans = Mat4.translation(-22, 13, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Live::" + this.lives.toString() + "/3", context.context);
                this.shapes.text.draw(context, program_state, time_trans, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text
                }));
            }
            else if (this.lives<1&&this.collided_number<10)
            {
                this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.forest
                }));
                this.shapes.square.draw(context, program_state, Mat4.translation(-3, 7, 20).times(Mat4.scale(10, 10, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.gameOver
                }));
                this.endGame=true;
            }
            else if(this.lives>=1&&this.collided_number>=10)
            {
                this.endGame=true;
                this.shapes.square.draw(context, program_state, Mat4.translation(0, 3, 19).times(Mat4.scale(28, 28, 5)), this.material.override({
                    ambient: 1,
                    texture: this.data.textures.forest
                }));
                let Text_transform =  Mat4.translation(-10, 5, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("Congratulation!", context.context);
                this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text}));
                Text_transform=Mat4.translation(-15, 3, 20).times(Mat4.scale(0.7, 0.7, 1, 1));
                this.shapes.text.set_string("You have passed all the level!", context.context);
                this.shapes.text.draw(context, program_state, Text_transform, this.material.override({
                    ambient: 1,
                    texture: this.data.textures.text}));
                this.startNextLevel2=false;

            }
        }


    }

}