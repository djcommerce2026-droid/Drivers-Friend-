import { W as WebPlugin } from "./index.js";
class NativeSettingsWeb extends WebPlugin {
  async open() {
    return {
      success: false,
      error: "NativeSettings is not supported on the web platform."
    };
  }
  async openAndroid() {
    return {
      success: false,
      error: "NativeSettings is not supported on the web platform."
    };
  }
  async openIOS() {
    return {
      success: false,
      error: "NativeSettings is not supported on the web platform."
    };
  }
}
export {
  NativeSettingsWeb
};
