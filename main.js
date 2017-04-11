/**
 * Created by snail on 4/9/17.
 */
document.addEventListener('signed in', (evt) => {
    new Resources();
    new User(evt.detail.user, evt.detail.ref);
    new ChunkManager();
    new Camera();
});
