import { useRef, useState } from "react";
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { type Feedback } from './file/fileOps';
import { savedSnapshot } from './file/fileState';
import { comparableSnapshot } from './file/serialize';
import { message } from 'antd';
import { getCurrentWindow  } from "@tauri-apps/api/window";
import { uiOverrides, tldrawComponents, customAssetUrls, customTools } from './components/tldraw/tldrawConfig';
import { handleCustomTldrawPaste } from './components/tldraw/handlePaste';
import { useAppMenu, useCloseHandler, usePathRedirect, useSaveShortcuts, useStartupFile, useTldrawSettingsPersistence, useWindowTitle } from './hooks';

getCurrentWindow().listen("my-window-event", ({ event, payload }) => {
  console.log(event)
  console.log(payload)
 });

function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;
  const feedback: Feedback = {
    success: (msg) => messageApi.open({ type: 'success', content: msg }),
    error: (msg) => messageApi.open({ type: 'error', content: msg }),
  };

  usePathRedirect();
  useStartupFile(editor);
  useTldrawSettingsPersistence(editor);
  useAppMenu({ editor, feedback });
  useSaveShortcuts({ messageApi, editorRef });
  useCloseHandler({ messageApi, editorRef });
  useWindowTitle();

  return (
    <main className="container">
          {contextHolder}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Tldraw
          onMount={(editor) => {
            if(!editor) return;
            setEditor(editor)

            if (savedSnapshot.get() === null) {
              savedSnapshot.set(comparableSnapshot(editor));
            }

            editor.registerExternalContentHandler('tldraw', (content) =>{
              handleCustomTldrawPaste(editor,content);
            })
          }}
          tools={customTools}
          overrides={uiOverrides}
          components={tldrawComponents}
          assetUrls={customAssetUrls}
          licenseKey={import.meta.env.VITE_TLDRAW_LICENSE}
         />
         
      </div>
    </main>
  );
  
}

export default App;
