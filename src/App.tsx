import { useEffect, useState } from "react";
import { Editor, Tldraw, hardReset,parseTldrawJsonFile,createTLSchema, TLUiOverrides, TLComponents, useTools, useIsToolSelected,
   DefaultToolbar, TldrawUiMenuItem, DefaultToolbarContent, TLUiAssetUrlOverrides } from 'tldraw'
import 'tldraw/tldraw.css'
import { save,open,ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { Menu, Submenu, MenuItem } from '@tauri-apps/api/menu';
import { message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow  } from "@tauri-apps/api/window";
import { shapeButtons } from "./components/tldraw/shapeButtons";
import { IconsTool } from './components/tldraw/IconButton'
import iconS from './assets/pen-tool.png'
import { CustomStylePanel } from "./components/tldraw/customStylePanel";

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
  const [currentFilePath, setCurrentFilePath] = useState<String | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const defaultFileName = 'drawing';

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



  const success = () => {
    messageApi.open({
      type: 'success',
      content: 'Saved successfully',
    });
  };


  useEffect(() => {
     const fetchData = async () => {
      let userSelectedFile:any = await invoke('get_startup_args');
      if(userSelectedFile && userSelectedFile.length > 0){
        await loadTldrawFile(userSelectedFile[0])
        setCurrentFilePath(userSelectedFile[0]);
      }
     }
    fetchData()
  }, [editor]);

  // Disable context menu
  useEffect(() => {
    const disableContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    window.addEventListener('contextmenu', disableContextMenu);
    
    return () => {
      window.removeEventListener('contextmenu', disableContextMenu);
    };
  }, []);

  const initializeMenu = async () => {
    try {
      const fileSubmenu = await Submenu.new({
        text: 'File',
        items: [
          await MenuItem.new({
            id: 'new',
            text: 'New',
            action: () => {
              console.log('New clicked');
              handleNew();
            },
          }),
          await MenuItem.new({
            id: 'open',
            text: 'Open',
            action: () => {
              handleOpen();
            },
          }),
          await MenuItem.new({
            id: 'save',
            text: 'Save',
            action: () => {
              handleSave(); // Changed from this.handleSave() to handleSave()
            },
          }),
          await MenuItem.new({
            id: 'save-as',
            text: 'Save As',
            action: () => {
              handleSaveAs();
            },
          }),
        ],
      });

      const menu = await Menu.new({
        items: [
          fileSubmenu
        ],
      });
      menu.setAsAppMenu();
    } catch (error) {
      console.error('Error initializing menu:', error);
    }
  };

  initializeMenu();
 

  
    //Handle Ctrl+S and Ctrl+Shift+S keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = async (e:any) => {
        // Check for Ctrl+Shift+S or Cmd+Shift+S (Save As)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSaveAs();
          return;
        }
        
        // Check for Ctrl+S or Cmd+S (Save)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleSave();
          return;
        }
      };
  
      // Add event listener
      window.addEventListener('keydown', handleKeyDown);
      
      // Cleanup: remove event listener
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [currentFilePath,editor]); // Include currentFilePath in dependencies

  // Handle window close event
  useEffect(() => {
    const setupCloseHandler = async () => {
      const unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
        console.log("Close requested");
        
        // Prevent the window from closing initially
        event.preventDefault();
        
        // Show save dialog
        try {
          const answer = await ask('Do you want to save your changes before closing?', {
            title: 'Save Changes',
            kind: 'warning',
          });
          
          if (answer) {
            // User wants to save
            try {
              await handleSave();
              console.log("Saved successfully, now closing");
            } catch (error) {
              console.error('Error saving before close:', error);
            }
          } else {
            // User chose not to save
            console.log("User chose not to save");
          }
          
          // After handling the dialog, close the window by destroying it
          await getCurrentWindow().destroy();
          
        } catch (error) {
          console.error('Error handling close request:', error);
          // If there's an error, try to close anyway
          try {
            await getCurrentWindow().destroy();
          } catch (destroyError) {
            console.error('Error destroying window:', destroyError);
          }
        }
      });

      // Return cleanup function
      return unlisten;
    };

    let unlistenPromise = setupCloseHandler();

    return () => {
      // Cleanup the event listener
      unlistenPromise.then(unlisten => unlisten?.());
    };
  }, [handleSave]); // Include handleSave in dependencies

  // Update window title when file path changes
  useEffect(() => {
    const updateTitle = async () => {
      const window = getCurrentWindow();
      if (currentFilePath) {
        const filename = currentFilePath.split('/').pop() || currentFilePath.split('\\').pop();
        await window.setTitle(`Rishah - ${filename}`);
      } else {
        await window.setTitle('Rishah - Untitled');
      }
    };
    
    updateTitle();
  }, [currentFilePath]);
  
    async function handleSave(){
    try {
      console.log(editor)
      if (!editor) return;

      const DataToSave = await prepareFileForSave()
      console.log(DataToSave)
      if(!DataToSave) return;
  
      if(currentFilePath){
        await writeTextFile(currentFilePath?.toString(), DataToSave);
        success();
        return;
      }



      // Use Tauri's dialog to let the user choose where to save the file
      const savePath = await save({
        defaultPath: `${defaultFileName}.tldr`,
        filters: [{
          name: 'TLDraw Files',
          extensions: ['tldr']
        }]
      });
      
      // If the user cancelled the dialog, savePath will be null
      if (!savePath) return;
      
      // Write the tldraw file to the selected location
      await writeTextFile(savePath, DataToSave);
      setCurrentFilePath(savePath);

      
      console.log(`File saved successfully to: ${savePath}`);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  async function handleSaveAs(){
    try {
      console.log(editor)
      if (!editor) return;

      const DataToSave = await prepareFileForSave()
      console.log(DataToSave)
      if(!DataToSave) return;

      // Use Tauri's dialog to let the user choose where to save the file
      const savePath = await save({
        defaultPath: `${defaultFileName}.tldr`,
        filters: [{
          name: 'TLDraw Files',
          extensions: ['tldr']
        }]
      });
      
      // If the user cancelled the dialog, savePath will be null
      if (!savePath) return;
      
      // Write the tldraw file to the selected location
      await writeTextFile(savePath, DataToSave);
      setCurrentFilePath(savePath);

      success();
      
      console.log(`File saved successfully to: ${savePath}`);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  async function prepareFileForSave(){
    if (!editor) return;
    const exportedContent = editor?.getSnapshot();
    const store = exportedContent.document.store
    const schema = exportedContent.document.schema
    let records = [];
		for (const record of Object.values(store)) {
      console.log(record)
      records.push(record);
		}
		const body = JSON.stringify(
				{
					schema: schema,
					records: records,
          tldrawFileFormatVersion:1
				}
      )

    return body;
  }

  const handleOpen = async () =>{
    try {     
      // Open file dialog, filter for .tldraw files
      const selected = await open({
        filters: [{ name: 'Tldraw Files', extensions: ['tldr'] }],
        multiple: false
      });
      
      if(!selected)
        return;

      await loadTldrawFile(selected.toString())


    } catch (error) {    
      //setCurrentFilePath(null)
      alert("was not able to open the file. the tldr version is mismatch with app version.please download latest version")
      console.error('Error opening file:', error);
      // You might want to show an error message to the user
    }
  }

  const loadTldrawFile = async (data:string) => {
    if (!editor) return;
    const fileContent:any = await readTextFile(data);
    const parseFileResult = parseTldrawJsonFile({ json: fileContent, schema: createTLSchema() });
    console.log(parseFileResult)
    // @ts-ignore
    const snapshot = parseFileResult.value.getStoreSnapshot()
    editor.loadSnapshot(snapshot)
  }

  const handleNew = async () =>{
    try {
      const answer = await ask('Would you like to save the current file?', {
        title: 'Tauri',
        kind: 'warning',
      });
      
      if(answer){
        await handleSave();
      }

      if (editor) {
        editor.dispose();
      }

      hardReset({shouldReload:true})
     
      
    } catch (error) {
      console.error('Error opening file:', error);
      // You might want to show an error message to the user
    }
  }

  

  return (
    <main className="container">
      {contextHolder}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <div style={{ flex: 1 }}>
        <Tldraw onMount={(editor) => {
          console.log("onMount")
          console.log(editor)
          if(editor){
            setEditor(editor)
            console.log("new editor set")
          }
          editor.user.updateUserPreferences({ isSnapMode: true })
          }} tools={customTools}
				overrides={uiOverrides}
				components={{...components,...shapeButtons,StylePanel:CustomStylePanel}}
				assetUrls={customAssetUrls}
         />
      </div>
    </div>
  
    </main>
  );
  
}

export default App;


