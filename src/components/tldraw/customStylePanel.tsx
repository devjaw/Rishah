import { ColorPicker } from 'antd'
import React, { useEffect } from 'react'
import { useRef } from 'react'
import { Editor, useEditor, useRelevantStyles, DefaultStylePanelContent, DefaultStylePanel, TldrawUiSlider, DefaultColorStyle, TldrawUiToolbar,
    TldrawUiButtonPicker, getDefaultColorTheme,
    TLShape
} from 'tldraw'

const STYLES = {
	color: [
		{ value: 'black', icon: 'color' },
		{ value: 'grey', icon: 'color' },
		{ value: 'light-violet', icon: 'color' },
		{ value: 'violet', icon: 'color' },
		{ value: 'blue', icon: 'color' },
		{ value: 'light-blue', icon: 'color' },
		{ value: 'yellow', icon: 'color' },
		{ value: 'orange', icon: 'color' },
		{ value: 'green', icon: 'color' },
		{ value: 'light-green', icon: 'color' },
		{ value: 'light-red', icon: 'color' },
		{ value: 'red', icon: 'color' }
	]
}

export const CustomStylePanel = () => {
    console.log("call CustomStylePanel")
    const editor = useEditor()
    let selectedShape = editor.getOnlySelectedShape()
   
     const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(null);
    useEffect(() => {
        const handleSelectionChange = () => {
            console.log("test21")
            const currentShape = editor.getOnlySelectedShape();
            const currentId = currentShape?.id || null;
            
            // Only update if the selected shape ID actually changed
            if (currentId !== selectedShapeId) {
                console.log("Selection changed, updating selectedShapeId");
                setSelectedShapeId(currentId);
            }
        };
        
        // Subscribe to store changes (this includes selection changes)
        const unsubscribe = editor.store.listen(handleSelectionChange);
        
        return () => {
            unsubscribe();
        };
    }, [editor, selectedShapeId]);


    const styles = useRelevantStyles()
    
    if (!styles) return null

    let isIconSelected = selectedShape?.meta?.type === 'icon';

    const theme = getDefaultColorTheme({ isDarkMode: false })
    const SVGStrokSlider = () => {
    console.log("SVGStrokSlider")
    const editor = useEditor()
        let selectedShape = editor.getOnlySelectedShape()
        const sliderRef = useRef<HTMLDivElement>(null)

        
        // Define your stroke width values
        const strokeWidthValues = [0.5, 1, 1.5, 2, 2.5, 3] as const;
        
        const [currentStrokeIndex, setCurrentStrokeIndex] = React.useState<number>(() => {
            const currentStroke = getStroke(selectedShape);
            const closestIndex = strokeWidthValues.findIndex(val => val === currentStroke) || 0;
            return closestIndex;
        });


        useEffect(() => {
        if (selectedShape) {
            const currentStroke = getStroke(selectedShape);
            const closestIndex = strokeWidthValues.findIndex(val => val === currentStroke) || 0;
            console.log('Updating stroke index to:', closestIndex, 'for stroke:', currentStroke);
            setCurrentStrokeIndex(closestIndex);
        }
    }, [selectedShape?.id, selectedShape?.meta?.stroke]);
        
        const handleStrokeValueChange = (index: number) => {
            const strokeValue = strokeWidthValues[index];
            setIconStrokeWidth(editor, strokeValue);
            setCurrentStrokeIndex(index);
            console.log(strokeValue)
        }

        return(
            <TldrawUiSlider
            key={selectedShape?.id}
                ref={sliderRef}
                value={currentStrokeIndex}
                // @ts-ignore
                label={strokeWidthValues[currentStrokeIndex] || 0}
                onValueChange={handleStrokeValueChange}
                onHistoryMark={()=>{}}
                steps={strokeWidthValues.length - 1} 
                title={'Stroke Width'}
            />
        )
    }
    
    const SVGColorPicker = () =>{
        let selectedShape = editor.getOnlySelectedShape()
        if(!selectedShape) return

        console.log(selectedShape)
        const shapeColorName = selectedShape.meta.colorName?.toString()
        const [selectedColor, setSelectedColor] = React.useState<string|null>(() => {
            const shapeColor = selectedShape.meta.color?.toString()
            if(shapeColor) 
                return shapeColor;
            else
                return 'black';
        });
        
        return(
            <div>
                <TldrawUiToolbar label={''}>
                    <TldrawUiButtonPicker
                        title={'Color'}
                        uiType="color"
                        style={DefaultColorStyle}
                        items={STYLES.color}
                        
                        // @ts-ignore
                        value={shapeColorName ? shapeColorName :  'black'} 
                        theme={theme} 
                        onValueChange= {(_e,color:string)=>{
                            const theme = getDefaultColorTheme({ isDarkMode: false });
                            // @ts-ignore
                            const b =  theme[color]?.solid || null;
                            setColorRgb(b,editor,color)
                            setSelectedColor(b)
                        }}
                    />
                </TldrawUiToolbar>
                
               <div>
                    <ColorPicker style={{
                        background:'#eeeeee',width:'92%', margin:5,
	                    height: '30px',
                        minWidth: '40px',
                        padding: '0px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'transparent',
                        cursor: 'pointer'
                    }} value={selectedColor} size="small" 
                    showText={() => <span style={{fontStyle:'normal',fontWeight:400,fontSize: '12px',fontFamily: 'Segoe UI'}}>custom</span>}
                    onChange={(e:any)=>{
                        setColorRgb(e?.toHexString(),editor,null)
                        setSelectedColor(e?.toHexString())
                    }}
                    />
                </div>               
            </div>

        )
    }

    return (
        <DefaultStylePanel>
      
            <DefaultStylePanelContent styles={styles} />
            {isIconSelected && 
                <div>
                    <div className="tlui-style-panel__section__common">
                        <SVGColorPicker />
                    </div>
                    <div className="tlui-style-panel__section__common">
                        <p style={{marginLeft:'10px',marginBottom:'-5px'}}>Width Stroke</p>
                        <SVGStrokSlider />
                    </div>
                </div>
        }
        </DefaultStylePanel>
    )
}




function getStroke(selectedShape: TLShape | null): number {
    if(!selectedShape) return 0

    return Number(selectedShape.meta?.stroke) || 2
}

function setIconStrokeWidth(editor:Editor, num:Number){
    let selectedShape = editor.getOnlySelectedShape()
    if(!selectedShape) return;
    // @ts-ignore
    let assetID:any = selectedShape?.props.assetId ?? null;

   // console.log(selectedShape)
    const c = editor.getAsset(assetID)



    // Decode the SVG
    const decodedSvg = decodeURIComponent(c.props.src.replace('data:image/svg+xml;utf8,', ''));
    const updatedSvg = decodedSvg.replace(/stroke-width="[^"]*"/g, `stroke-width="${num}"`);

    // Encode it back to a data URI
    const newSrc = 'data:image/svg+xml;utf8,' + encodeURIComponent(updatedSvg);

     

    editor.updateAssets([{ 
        id: assetID, 
        type: c.type,
        props: {
            ...c.props,
            src: newSrc,
        }
    }])

    editor.updateShape({ 
        id: selectedShape?.id, 
        type: selectedShape.type,
        meta:{
            ...selectedShape.meta,
            stroke:num.toString()
        }
    })

   // const d = editor.getAsset(assetID)
   // console.log(d)
}

function setColorRgb(x:any,editor:Editor,ColorName:string|null){
  if(!x) return;
  let selectedShape = editor.getOnlySelectedShape()
  if(!selectedShape) return
  // @ts-ignore
  let assetID:any = selectedShape?.props.assetId ?? null;

  const c = editor.getAsset(assetID)
  // Decode the SVG
  const decodedSvg = decodeURIComponent(c.props.src.replace('data:image/svg+xml;utf8,', ''));

  // Update the stroke color (change "red" to your desired color)
  const updatedSvg = decodedSvg.replace(/stroke="[^"]*"/, `stroke="${x}"`);


  // Encode it back to a data URI
  const newSrc = 'data:image/svg+xml;utf8,' + encodeURIComponent(updatedSvg);

  editor.updateAssets([{ 
    id: assetID, 
    type: c.type,
    props: {
        ...c.props,
        src: newSrc
    },
    meta:{
        ...c.meta,
        
    }
   }])

    editor.updateShape({ 
        id: selectedShape?.id, 
        type: selectedShape.type,
        meta:{
            ...selectedShape.meta,
            color: x,
            colorName : ColorName
        }
    })
}