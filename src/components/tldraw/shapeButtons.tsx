import { createShapeId, Editor, intersectLineSegmentPolygon, stopEventPropagation, TLArrowBinding, TLArrowShape, 
  TLComponents, TLShapeId, useEditor, useValue, Vec
} from 'tldraw'
import 'tldraw/tldraw.css'
import { Button, Popover } from 'antd';


export const shapeButtons: TLComponents = {
  ImageToolbar: null,
    InFrontOfTheCanvas: () => {
      console.log("InFrontOfTheCanvas")
      const editor = useEditor()
      console.log(editor.getOnlySelectedShape())
      if(!editor)
          return;

      let selectedShape = editor.getOnlySelectedShape()
      if(!selectedShape)
        return;

      if(selectedShape?.type !="geo")
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





const content = (
  <div style={{ marginTop: '-25px' }}>
    <p>Draw line from shape</p>
  </div>
);
  
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
<Popover content={content}  styles={{ body: {height: '5px'} }}>
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
  </Popover>
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
    console.log(editor.getSelectedShapes())

    const newShape = editor.getSelectedShapes();
    const duplicatedShapesMap = editor.duplicateShapes(newShape, offset)
    console.log(duplicatedShapesMap)


    const newlySelectedShapes = editor.getSelectedShapeIds();
    editor.updateShape({ id: newlySelectedShapes[0], type: newShape[0].type, props: { richText : {
      type: "doc",
      content: [{ type: "paragraph" }]
    }}})

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
        x: arrowPointInParentSpace.x,
        y: arrowPointInParentSpace.y,
        props: {
          kind: 'elbow',
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