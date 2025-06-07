import { useEffect, useState } from "react";
import { createShapeId, Editor, intersectLineSegmentPolygon, stopEventPropagation, TLArrowBinding, TLArrowShape, 
  TLComponents, Tldraw, TLShapeId, useEditor, useValue, Vec,hardReset
} from 'tldraw'
import 'tldraw/tldraw.css'
import { save,open,ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { Menu, MenuItem, Submenu } from '@tauri-apps/api/menu';
import { Button, message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow  } from "@tauri-apps/api/window";


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

  // const error = () => {
  //   messageApi.open({
  //     type: 'error',
  //     content: 'This is an error message',
  //   });
  // };
  



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
            id: 'save_as',
            text: 'Save As...',
            action: () => {
              handleSave(); // Changed from this.handleSave() to handleSave()
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
 

  
    //Handle Ctrl+S keyboard shortcut
    useEffect(() => {
      const handleKeyDown = async (e:any) => {
         // Prevent browser's save dialog
        // Check for Ctrl+S (or Cmd+S on Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave()
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

      // Export the current drawing as a tldraw file (JSON)
      const exportedContent = editor.store.getSnapshot();
      const content = JSON.stringify(exportedContent);
      
      console.log(currentFilePath)

      if(currentFilePath){
        await writeTextFile(currentFilePath?.toString(), content);
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
      await writeTextFile(savePath, content);
      setCurrentFilePath(savePath);

      
      console.log(`File saved successfully to: ${savePath}`);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

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

      // Check if a file was selected (user didn't cancel)
      

        // Read the file content
      const fileContent:any = await readTextFile(selected.toString());
      const tldrawData = JSON.parse(fileContent);
      let finalJson = tldrawData;

      editor.loadSnapshot(finalJson);

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

  const components: TLComponents = {
    InFrontOfTheCanvas: () => {
      
      const editor = useEditor()
      //console.log(editor.getOnlySelectedShape())
      if(!editor)
          return;
      if(editor.getOnlySelectedShape()?.type !="geo")
          return;
      const info = useValue(
        'selection bounds',
        () => {
          const screenBounds = editor.getViewportScreenBounds()
          const rotation = editor.getSelectionRotation()
          const rotatedScreenBounds = editor.getSelectionRotatedScreenBounds()
          if (!rotatedScreenBounds) return
          return {
            // we really want the position within the
            // tldraw component's bounds, not the screen itself
            x: rotatedScreenBounds.x - screenBounds.x,
            y: rotatedScreenBounds.y - screenBounds.y,
            width: rotatedScreenBounds.width,
            height: rotatedScreenBounds.height,
            rotation: rotation,
          }
        },
        [editor]
      )
  
      if (!info) return
  
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transformOrigin: 'top left',
            transform: `translate(${info.x}px, ${info.y}px) rotate(${info.rotation}rad)`,
            pointerEvents: 'all',
          }}
          onPointerDown={stopEventPropagation}
        >
          <DuplicateInDirectionButton y={-40} x={info.width / 2 - 16} rotation={-(Math.PI / 2)} />
          <DuplicateInDirectionButton y={info.height / 2 - 16} x={info.width + 8} rotation={0} />
          <DuplicateInDirectionButton y={info.height + 8} x={info.width / 2 - 16} rotation={(Math.PI / 2)} />
          <DuplicateInDirectionButton y={info.height / 2 - 16} x={-40} rotation={Math.PI} />
        </div>
      )
    },
  }
  
  function DuplicateInDirectionButton({
    x,
    y,
    rotation,
  }: {
    x: number
    y: number
    rotation: number
  }) {
    const editor = useEditor()
    return (
  
      
    //    <Button
    //    className="flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
    //    style={{
    //      position: 'absolute',
    //      width: '32px',
    //      height: '32px',
    //      pointerEvents: 'all',
    //      transform: `translate(${x}px, ${y}px) rotate(${rotation}rad)`,
    //    }}
    //    onPointerDown={stopEventPropagation}
    //    onClick={() => {
    //      DuplicateShape(rotation, editor);
    //    }}
    //  >
    //    <span className="font-extrabold text-lg flex items-center justify-center w-full h-full">→</span>
    //  </Button>

<Button
shape="circle"
style={{
  position: 'absolute',
  width: '32px',
  height: '32px',
  pointerEvents: 'all',
  transform: `translate(${x}px, ${y}px) rotate(${rotation}rad)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0
}}
onPointerDown={stopEventPropagation}
onClick={() => {
  DuplicateShape(rotation, editor);
}}
>
<span style={{ 
        fontWeight: 800, 
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        lineHeight: 1,
        marginTop: '-2px'
      }}>→</span>
</Button>
  
  
      // <button
      // 	style={{
      // 		position: 'absolute',
      // 		width: 32,
      // 		height: 32,
      // 		pointerEvents: 'all',
      // 		transform: `translate(${x}px, ${y}px) rotate(${rotation}rad)`,
      // 	}}
      // 	onPointerDown={stopEventPropagation}
      // 	onClick={() => {
      // 		DuplicateShape(rotation)
      // 	}}
      // >
      // 	→
      // </button>
    )
  }
  
  
  const DuplicateShape = (rotation: number,editor : Editor) => {
    
    const selectionRotation = editor.getSelectionRotation() ?? 0
    const rotatedPageBounds = editor.getSelectionRotatedPageBounds()!
    const selectionPageBounds = editor.getSelectionPageBounds()!
    if (!(rotatedPageBounds && selectionPageBounds)) return

    editor.markHistoryStoppingPoint()

    const PADDING = 32

    // Find an intersection with the page bounds
    const center = Vec.Rot(rotatedPageBounds.center, selectionRotation)
    const int = intersectLineSegmentPolygon(
      center,
      Vec.Add(center, new Vec(100000, 0).rot(selectionRotation + rotation)),
      rotatedPageBounds
        .clone()
        .expandBy(PADDING)
        .corners.map((c) => c.rot(selectionRotation))
    )
    if (!int?.[0]) return

    // Get the direction and distance to the intersection
    const delta = Vec.Sub(int[0], center)
    const dist = delta.len()
    const dir = delta.norm()

    // Get the offset for the duplicated shapes
    const offset = dir.mul(dist * 2)



    const originalShapes = editor.getSelectedShapeIds()
    console.log(originalShapes)
    //const originalShapeIds = Array.from(originalShapes)
    const duplicatedShapesMap = editor.duplicateShapes(editor.getSelectedShapes(), offset)
    console.log(duplicatedShapesMap)


    const newlySelectedShapes = editor.getSelectedShapeIds();



    createArrowBetweenShapes(editor,originalShapes[0],newlySelectedShapes[0]);
  }
  
  function createArrowBetweenShapes(
    editor: Editor,
    startShapeId: TLShapeId,
    endShapeId: TLShapeId,
    options = {} as {
      parentId?: TLShapeId
      start?: Partial<Omit<TLArrowBinding['props'], 'terminal'>>
      end?: Partial<Omit<TLArrowBinding['props'], 'terminal'>>
    }
  ) {
    const { start = {}, end = {}, parentId } = options
  
    // [1]
    const {
      normalizedAnchor: startNormalizedAnchor = { x: 0.5, y: 0.5 },
      isExact: startIsExact = false,
      isPrecise: startIsPrecise = false,
    } = start
    const {
      normalizedAnchor: endNormalizedAnchor = { x: 0.5, y: 0.5 },
      isExact: endIsExact = false,
      isPrecise: endIsPrecise = false,
    } = end
  
    const startTerminalNormalizedPosition = Vec.From(startNormalizedAnchor)
    const endTerminalNormalizedPosition = Vec.From(endNormalizedAnchor)
  
    const parent = parentId ? editor.getShape(parentId) : undefined
    if (parentId && !parent) throw Error(`Parent shape with id ${parentId} not found`)
  
    const startShapePageBounds = editor.getShapePageBounds(startShapeId)
    const endShapePageBounds = editor.getShapePageBounds(endShapeId)
  
    const startShapePageRotation = editor.getShapePageTransform(startShapeId).rotation()
    const endShapePageRotation = editor.getShapePageTransform(endShapeId).rotation()
  
    if (!startShapePageBounds || !endShapePageBounds) return
  
    const startTerminalPagePosition = Vec.Add(
      startShapePageBounds.point,
      Vec.MulV(
        startShapePageBounds.size,
        Vec.Rot(startTerminalNormalizedPosition, startShapePageRotation)
      )
    )
    const endTerminalPagePosition = Vec.Add(
      endShapePageBounds.point,
      Vec.MulV(
        startShapePageBounds.size,
        Vec.Rot(endTerminalNormalizedPosition, endShapePageRotation)
      )
    )
  
    const arrowPointInParentSpace = Vec.Min(startTerminalPagePosition, endTerminalPagePosition)
    if (parent) {
      arrowPointInParentSpace.setTo(
        editor.getShapePageTransform(parent.id)!.applyToPoint(arrowPointInParentSpace)
      )
    }
  
    const arrowId = createShapeId()
    editor.run(() => {
      editor.markHistoryStoppingPoint('creating_arrow')
      editor.createShape<TLArrowShape>({
        id: arrowId,
        type: 'arrow',
        // [2]
        x: arrowPointInParentSpace.x,
        y: arrowPointInParentSpace.y,
        props: {
          // [3]
          start: {
            x: arrowPointInParentSpace.x - startTerminalPagePosition.x,
            y: arrowPointInParentSpace.x - startTerminalPagePosition.x,
          },
          end: {
            x: arrowPointInParentSpace.x - endTerminalPagePosition.x,
            y: arrowPointInParentSpace.x - endTerminalPagePosition.x,
          },
        },
      })
  
      editor.createBindings<TLArrowBinding>([
        {
          fromId: arrowId,
          toId: startShapeId,
          type: 'arrow',
          props: {
            terminal: 'start',
            normalizedAnchor: startNormalizedAnchor,
            isExact: startIsExact,
            isPrecise: startIsPrecise,
          },
        },
        {
          fromId: arrowId,
          toId: endShapeId,
          type: 'arrow',
          props: {
            terminal: 'end',
            normalizedAnchor: endNormalizedAnchor,
            isExact: endIsExact,
            isPrecise: endIsPrecise,
          },
        },
      ])
    })
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
          }} components={components} />
      </div>
    </div>
  
    </main>
  );
  
}

export default App;


