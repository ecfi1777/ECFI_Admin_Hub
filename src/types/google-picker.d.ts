declare namespace google.picker {
  class PickerBuilder {
    constructor();
    addView(view: DocsUploadView | DocsView | View): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setCallback(callback: (data: PickerCallbackData) => void): PickerBuilder;
    setOrigin(origin: string): PickerBuilder;
    setTitle(title: string): PickerBuilder;
    enableFeature(feature: Feature): PickerBuilder;
    build(): Picker;
  }

  class DocsUploadView {
    constructor();
    setParent(parentId: string): DocsUploadView;
    setMimeTypes(mimeTypes: string): DocsUploadView;
  }

  class DocsView {
    constructor(viewId?: ViewId);
    setParent(parentId: string): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
  }

  class View {
    constructor(viewId: ViewId);
  }

  interface Picker {
    setVisible(visible: boolean): void;
    dispose(): void;
  }

  interface PickerCallbackData {
    action: string;
    docs?: PickerDocument[];
  }

  interface PickerDocument {
    id: string;
    name: string;
    url: string;
    mimeType: string;
    sizeBytes?: number;
  }

  enum Action {
    CANCEL = "cancel",
    PICKED = "picked",
  }

  enum ViewId {
    DOCS = "all",
    DOCS_UPLOAD = "docs-upload",
    FOLDERS = "folders",
  }

  enum Feature {
    MULTISELECT_ENABLED = "multiselect",
  }
}

interface Window {
  gapi: {
    load: (api: string, callback: () => void) => void;
  };
  google: {
    picker: typeof google.picker;
  };
}
