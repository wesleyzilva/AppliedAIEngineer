export class SceneManager {
  constructor(app) {
    this.app = app;
    this.currentScene = null;
  }

  changeScene(scene) {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene.container);
    }

    this.currentScene = scene;
    this.currentScene.init();
  }
}
