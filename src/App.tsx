import { useEffect, useState } from "react";
import { Editor, Tldraw, hardReset,parseTldrawJsonFile,createTLSchema } from 'tldraw'
import 'tldraw/tldraw.css'
import { save,open,ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { Menu, MenuItem, Submenu } from '@tauri-apps/api/menu';
import { message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow  } from "@tauri-apps/api/window";
import { shapeButtons } from "./components/tldraw/shapeButtons";

getCurrentWindow().listen("my-window-event", ({ event, payload }) => {
  console.log(event)
  console.log(payload)
 });

function App() {
  const [fileName, setFileName] = useState('drawing');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<String | null>(null);
  const [messageApi, contextHolder] = message.useMessage();


  const success = () => {
    messageApi.open({
      type: 'success',
      content: 'Saved successfully',
    });
  };


  useEffect(() => {
    console.log("call use effect")
    console.log(editor)
     const fetchData = async () => {
      let a:any = await invoke('get_startup_args');
      //alert(a)
      console.log(a)
      if(a && a.length > 0){
        const content = await readTextFile(a[0]);
        const data = JSON.parse(content);
        console.log(editor)
        console.log("test")
        if (!editor) return;
        editor.loadSnapshot(data);
        setCurrentFilePath(a[0]);
      }
     }
     fetchData()
    setFileName("drawing")
    console.log("test")
    console.log(editor)
    
  }, [editor]);

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
      // Do something with fileSubmenu, like saving it to state or using it
    //  console.log('Menu initialized:', fileSubmenu);
      // Example: setFileSubmenu(fileSubmenu);
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
        defaultPath: `${fileName}.tldr`,
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
        defaultPath: `${fileName}.tldr`,
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
      // Import Tauri dialog API
      if (!editor) return;
      
      // Open file dialog, filter for .tldraw files
      const selected = await open({
        filters: [{ name: 'Tldraw Files', extensions: ['tldr'] }],
        multiple: false
      });
      
    if(!selected)
      return;

        // Read the file content
      const fileContent:any = await readTextFile(selected.toString());

      const parseFileResult = parseTldrawJsonFile({ json: fileContent, schema: createTLSchema() });
      // @ts-ignore
      const snapshot = parseFileResult.value.getStoreSnapshot()
		  editor.loadSnapshot(snapshot)

      setCurrentFilePath(selected?.toString());

    } catch (error) {    
      //setCurrentFilePath(null)
      alert("was not able to open the file. the tldr version is mismatch with app version.please download latest version")
      console.error('Error opening file:', error);
      // You might want to show an error message to the user
    }
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
          }} components={shapeButtons} />
      </div>
    </div>
  
    </main>
  );
  
}

export default App;


