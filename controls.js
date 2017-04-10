/**
 * Created by snail on 4/9/17.
 */
class Controls {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouse = {
            x: 0, //
            y: 0,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            pressed: false,
            dragging: false
        };


        // listen via
        // controls.on.press = (evt) {...};
        this.on = {
            press(e) {
            },
            release(e) {
            },
            click(e) {
            },
            drag(e) {
            },
            move(e) {
            },
        };

        this.setupMouseEvents();
        this.setupTouchEvents();

    }

    down(x, y) {
        this.mouse.startX = this.mouse.x = x;
        this.mouse.startY = this.mouse.y = y;
        this.mouse.lastX = x;
        this.mouse.lastY = y;
        this.mouse.pressed = true;
        this.mouse.dragging = false;
        this.on.press(this.mouse);
    }

    move(x, y) {
        this.mouse.lastX = this.mouse.x;
        this.mouse.lastY = this.mouse.y;
        this.mouse.x = x;
        this.mouse.y = y;

        if (this.mouse.pressed) {
            if (Math.hypot(this.mouse.x - this.mouse.startX, this.mouse.y - this.mouse.startY) > 5)
                this.mouse.dragging = true;
            if (this.mouse.dragging)
                this.on.drag(this.mouse);
        }
        else
            this.on.move(this.mouse);
    }

    up(x, y) {
        if (!this.mouse.pressed) return;
        this.mouse.x = x;
        this.mouse.y = y;
        this.mouse.lastX = x;
        this.mouse.lastY = y;
        this.mouse.pressed = false;
        if (!this.mouse.dragging) this.on.click(this.mouse);
        this.mouse.dragging = false;
        this.on.release(this.mouse);
    }

    setupMouseEvents() {
        const T = this;
        this.canvas.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            T.down(e.clientX, e.clientY);
        };
        this.canvas.onmousemove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            T.move(e.clientX, e.clientY);
        };
        this.canvas.onmouseup = this.canvas.onmouseleave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            T.up(e.clientX, e.clientY);
        };
    }

    setupTouchEvents() {
        const T = this;
        let evt = null;
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            e.stopPropagation();
            evt = e.touches[0];
            T.down(evt.clientX, evt.clientY);
        });
        this.canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            e.stopPropagation();
            evt = e.touches[0];
            T.move(evt.clientX, evt.clientY);
        });
        this.canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            T.up(evt.clientX, evt.clientY);
        });
    }
}
