import { Color } from "./model.js";

export const OPTIONS = {
    scene: {
        show: {
            stationNames: false,
            centerLine: {
                spheres: true,
                segments: true
            },
            splay: {
                spheres: true,
                segments: true
            },            
        },
        stationSphereRadius: {
            centerLine: 1,
            splay: 1
        },
        zoomStep: 0.1,
        caveLines: {
            color: {
                start: new Color(0xff0000),
                end: new Color(0x0000ff),
                mode: {
                    value: 'global', 
                    choices: ['global', 'gradientByZ']
                }
            }
        }
    }
}