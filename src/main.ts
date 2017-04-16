/// <reference path="../node_modules/firebase/firebase.d.ts" />
/**
 * Created by snail on 4/9/17.
 */
import { ChunkManager } from "./chunkManager";
import { Camera } from "./camera";
import { Controls } from "./controls";
import { Resources } from "./resources";
import { User } from "./user";
import { initFirebase } from './firebase';

initFirebase((user, ref)=>{
  new Resources();
  new User(user,ref);
  new ChunkManager();
  new Camera();
  new Controls();
});
