import { useEffect, useRef, useState } from "react";
import { Editor, Tldraw, TLUiOverrides, TLComponents, useTools, useIsToolSelected,
   DefaultToolbar, TldrawUiMenuItem, DefaultToolbarContent, TLUiAssetUrlOverrides,
   defaultHandleExternalTldrawContent,TLTldrawExternalContent,AssetRecordType,useReactor
  } from 'tldraw'
import 'tldraw/tldraw.css'
import { setupAppMenu, type AppMenuHandlers } from './menu/appMenu';
import { saveFile, saveFileAs, openFile, newFile, loadFile, promptSaveBeforeClose, type Feedback } from './file/fileOps';
import { currentFilePath as currentFilePathAtom } from './file/fileState';
import { message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow  } from "@tauri-apps/api/window";
import { shapeButtons } from "./components/tldraw/shapeButtons";
import { IconsTool } from './components/tldraw/IconButton'
import iconS from './assets/pen-tool.png'
import { CustomStylePanel } from "./components/tldraw/customStylePanel";
import { initializeUserPreferences, saveUserPreferences, saveInstanceState, loadInstanceState } from "./utils/settingsManager";
import { getFilename } from "./utils/path";

getCurrentWindow().listen("my-window-event", ({ event, payload }) => {
  console.log(event)
  console.log(payload)
 });


 export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'toolbox-icons': iconS,
	},
}

const customTools = [IconsTool]

function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;
  const feedback: Feedback = {
    success: (msg) => messageApi.open({ type: 'success', content: msg }),
    error: (msg) => messageApi.open({ type: 'error', content: msg }),
  };

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.icons = {
			id: 'icons',
			icon: 'toolbox-icons',
			label: 'Icons',
			onSelect: () => {
				editor.setCurrentTool('icons')
			},
		}
		return tools
	},
}


const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isIconsSelected = useIsToolSelected(tools['icons'])
		return (
			<DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools['icons']} isSelected={isIconsSelected}/>
				<DefaultToolbarContent />
        
			</DefaultToolbar>
		)
	}
}



  useEffect(() => {
    if (!editor) return;
    const fetchData = async () => {
      let result: [string, string] | null = await invoke('get_startup_file_content');
      if (!result || !result[0] || !result[1]) return;
      loadFile(editor, result[1], result[0]);
    };
    fetchData();
  }, [editor]);


useReactor(
  'save-grid-mode',
  () => {
    if (!editor) return;

    const isGridMode = editor.getInstanceState().isGridMode;
   // console.log('Grid mode changed:', isGridMode);
    saveInstanceState({ isGridMode });
  },
  [editor]
);

useReactor(
  'save-user-preferences',
  () => {
    if (!editor) return;
    const userPrefs = editor.user.getUserPreferences();
   // console.log('User preferences changed:', userPrefs);
    saveUserPreferences(userPrefs);
  },
  [editor]
);

  // Disable context menu
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.location.replace('/com.rishah.app');
    }
    const disableContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    window.addEventListener('contextmenu', disableContextMenu);
    
    return () => {
      window.removeEventListener('contextmenu', disableContextMenu);
    };
  }, []);

  const menuHandlersRef = useRef<AppMenuHandlers | null>(null);
  menuHandlersRef.current = {
    onNew: () => newFile(editor, feedback),
    onOpen: () => openFile(editor, feedback),
    onSave: () => saveFile(editor, feedback),
    onSaveAs: () => saveFileAs(editor, feedback),
  };

  useEffect(() => {
    setupAppMenu({
      onNew: () => menuHandlersRef.current?.onNew(),
      onOpen: () => menuHandlersRef.current?.onOpen(),
      onSave: () => menuHandlersRef.current?.onSave(),
      onSaveAs: () => menuHandlersRef.current?.onSaveAs(),
    });
  }, []);


  
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const fb: Feedback = {
          success: (m) => messageApi.open({ type: 'success', content: m }),
          error: (m) => messageApi.open({ type: 'error', content: m }),
        };
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveFileAs(editorRef.current, fb);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveFile(editorRef.current, fb);
          return;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [messageApi]);

  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        const fb: Feedback = {
          success: (m) => messageApi.open({ type: 'success', content: m }),
          error: (m) => messageApi.open({ type: 'error', content: m }),
        };
        await promptSaveBeforeClose(editorRef.current, fb);
      } catch (error) {
        console.error('Error handling close request:', error);
      } finally {
        try {
          await getCurrentWindow().destroy();
        } catch (destroyError) {
          console.error('Error destroying window:', destroyError);
        }
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten?.());
    };
  }, [messageApi]);

  useReactor(
    'update-window-title',
    () => {
      const path = currentFilePathAtom.get();
      const title = path ? `Rishah - ${getFilename(path)}` : 'Rishah - Untitled';
      getCurrentWindow().setTitle(title);
    },
    [],
  );

  function handleCustomTldrawPaste(editor: Editor, { content, point }: TLTldrawExternalContent) {
    let a = content.shapes.filter((v) => v.meta?.type != null)
    if(!a) return;

    a.forEach(b => {
      // @ts-ignore
      let currentAssetId = b.props?.assetId
      //const c = editor.getAsset(currentAssetId)
      let getCurrentAsset = content.assets.filter((v) => v.id ==  currentAssetId)[0]
      console.log(getCurrentAsset)

      const assetId = AssetRecordType.createId()
      editor.createAssets([
        {
          ...getCurrentAsset,
          id: assetId,
        }
      ]);

      // @ts-ignore
      b.props.assetId = assetId;

    });

    defaultHandleExternalTldrawContent(editor, { content, point })
		return
    
}



  return (
    <main className="container">
          {contextHolder}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>


        <Tldraw
          onMount={(editor) => {
            if(!editor) return;
            setEditor(editor)

            // Load and apply saved preferences
            initializeUserPreferences().then(savedPrefs => {
              editor.user.updateUserPreferences(savedPrefs);
            });

            // Load and apply saved instance state (grid mode)
            loadInstanceState().then(savedInstanceState => {
              if (savedInstanceState) {
                editor.updateInstanceState({ isGridMode: savedInstanceState.isGridMode });
              }
            });

            editor.registerExternalContentHandler('tldraw', (content) =>{
              handleCustomTldrawPaste(editor,content);
            })
          }}
          tools={customTools}
          overrides={uiOverrides}
          components={{...components,...shapeButtons,StylePanel:CustomStylePanel}}
          assetUrls={customAssetUrls}
          licenseKey={import.meta.env.VITE_TLDRAW_LICENSE}
         />
         
    </div>
  
    </main>
  );
  
}

export default App;


