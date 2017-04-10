/**
 * Created by snail on 4/9/17.
 */
class Controls {
    constructor(canvas) {
        this.canvas = canvas;
        const mouse = {
            x: 0, //
            y: 0,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            pressed: false,
            dragging: false
        };

        const evts = {
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
        // listen via
        // controls.on.press = (evt) {...};
        this.on = evts;

        function down(x, y) {
            mouse.startX = mouse.x = x;
            mouse.startY = mouse.y = y;
            mouse.lastX = x;
            mouse.lastY = y;
            mouse.pressed = true;
            mouse.dragging = false;
            evts.press(mouse);
        }

        function move(x, y) {
            mouse.lastX = mouse.x;
            mouse.lastY = mouse.y;
            mouse.x = x;
            mouse.y = y;

            if (mouse.pressed) {
                if (Math.hypot(mouse.x - mouse.startX, mouse.y - mouse.startY) > 5)
                    mouse.dragging = true;
                if (mouse.dragging)
                    evts.drag(mouse);
            }
            else
                evts.move(mouse);
        }

        function up(x, y) {
            if(!mouse.pressed) return;
            mouse.x = x;
            mouse.y = y;
            mouse.lastX = x;
            mouse.lastY = y;
            mouse.pressed = false;
            if(!mouse.dragging) evts.click(mouse);
            mouse.dragging = false;
            evts.release(mouse);
        }

        this.setupMouseEvents(down, move, up);
        this.setupTouchEvents(down, move, up);

    }


    nativeTouchEvent(e) {
        mouse.lastX = mouse.x;
        mouse.lastY = mouse.y;
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        e.preventDefault();
        e.stopPropagation();
    }

    setupMouseEvents(down, move, up) {
        this.canvas.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            down(e.clientX, e.clientY);
        };
        this.canvas.onmousemove = (e) => {
            e.preventDefault();
            e.stopPropagation();
            move(e.clientX, e.clientY);
        };
        this.canvas.onmouseup = this.canvas.onmouseleave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            up(e.clientX, e.clientY);
        };
    }

    setupTouchEvents(down, move, up) {
        let evt = null;
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            e.stopPropagation();
            evt = e.touches[0];
            down(evt.clientX, evt.clientY);
        });
        this.canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            e.stopPropagation();
            evt = e.touches[0];
            move(evt.clientX, evt.clientY);
        });
        this.canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
            e.stopPropagation();
            up(evt.clientX, evt.clientY);
        });
    }
}
