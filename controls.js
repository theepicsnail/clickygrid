/**
 * Created by snail on 4/9/17.
 */
class Controls {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouse = {
            x : 0, //
            y : 0,
            lastX : 0,
            lastY : 0,
            pressed : false
        };

        this.setupMouseEvents();
        this.setupTouchEvents();

        // listen via
        // controls.on.press = (evt) {...};
        this.on = {
            press(e) {},
            release(e) {},
            click(e) {},
            drag(e) {},
            move(e) {},
        };
    }

    nativeMouseEvent(e) {
        this.mouse.lastX = this.mouse.x;
        this.mouse.lastY = this.mouse.y;
        let p = e;
        if (p.touches && p.touches[0])
            p = p.touches[0];
        this.mouse.x = p.clientX;
        this.mouse.y = p.clientY;
        e.preventDefault();
        e.stopPropagation();
    }
    nativeTouchEvent(e) {
        this.mouse.lastX = this.mouse.x;
        this.mouse.lastY = this.mouse.y;
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
        e.preventDefault();
        e.stopPropagation();
    }

    setupMouseEvents() {
        let dragging = false;
        this.canvas.onmousedown = (e) => {
            dragging = false;
            this.nativeMouseEvent(e);
            this.mouse.pressed = true;
            this.on.press(this.mouse);
        };
        this.canvas.onmousemove = (e) => {
            this.nativeMouseEvent(e);
            dragging = true;
            if (this.mouse.pressed)
                this.on.drag(this.mouse);
            else
                this.on.move(this.mouse);
        };
        this.canvas.onmouseup = (e) => {
            this.nativeMouseEvent(e);
            this.mouse.pressed = false;
            this.on.release(this.mouse);
            if (!dragging)
                this.on.click(this.mouse);
        };
    }

    setupTouchEvents() {
        const c = this.canvas;
        this.canvas.addEventListener("touchstart", c.onmousedown);
        this.canvas.addEventListener("touchend", c.onmouseup);
        this.canvas.addEventListener("touchmove", c.onmousemove);
    }
}
