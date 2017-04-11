class User {
    constructor(user, ref) {
        if (game.user)  throw new Error("User re-initialized");
        game.user = this;

        this.user = user;
        this.ref = ref;

        this.setupListeners();
    }

    setupListeners() {
        this.ref.on('value', (v) => {
            v = v.val();
            if (v === null)
                return this.spawn();
            return this.update(v);
        })
    }

    spawn() {
        const spawn = {x: 0, y: 0};
        const hash = window.location.hash.substr(1);
        if (hash) {
            const args = hash.split(",");
            spawn.x = parseInt(args[0]) | 0;
            spawn.y = parseInt(args[1]) | 0;
        }
        this.ref.set(spawn);
    }

    update(details) {
        game.camera.setCenter(details.x, details.y);

    }
}