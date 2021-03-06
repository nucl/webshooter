import React from 'react'
import ReactDOM from 'react-dom'

import { Provider } from 'react-redux'
import DevTools from './DevTools'

import { createLightingSprite, updateFov } from './lighting'
import { initLightSources } from './static_light'
import store from './store'
import scene from './scene'
import physicSystem from './physic-system'
import { createPhysics } from './physics'
import JSONTree from 'react-json-tree'

const { Engine } = Matter

window.onload = init

let visible = false

function init() {
    let meter = new FPSMeter(document.getElementById('fps'))
    
    const physicEngine = createPhysics()

    const renderCanvas = document.getElementById('renderCanvas')
    const renderer = PIXI.autoDetectRenderer(800, 600, {
        antialias: true,
        view: renderCanvas,
        backgroundColor: 0x000000
    })
    document.body.appendChild(renderer.view);

    renderCanvas.onmousedown = (e) => {
        store.dispatch({
            type: 'LEFT_MOUSE_DOWN',
        })
    }
    renderCanvas.onmouseup = (e) => {
        store.dispatch({
            type: 'LEFT_MOUSE_UP',
        })
    }

    renderCanvas.onclick = (e) => {
        renderCanvas.requestPointerLock();
    }

    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
    function lockChangeAlert() {
        if (document.pointerLockElement === renderCanvas ||
            document.mozPointerLockElement === renderCanvas) {
            document.addEventListener("mousemove", mousemove, false);
        } else {
            document.removeEventListener("mousemove", mousemove, false);
        }
    }

    function mousemove(e) {
        const x = e.movementX || e.mozMovementX || 0
        store.dispatch({
            type: 'UPDATE_ROTATION',
            payload: x,
        })
    }

    var stage = new PIXI.Container();

    scene.initScene(stage, physicEngine, store)


    var background = new PIXI.Graphics();
    var fovMask = new PIXI.Graphics();
    var backgroundInFov = new PIXI.Graphics();

    fovMask.beginFill(0xFFFFFF);
    fovMask.beginFill(0xFFFFFF, 1);

    var lightSources = initLightSources(store.getState().map.polygons)
    var lightingSprite = createLightingSprite(lightSources, 800, 600)

    var container = new PIXI.Container()
    var rt = new PIXI.RenderTexture(new PIXI.BaseRenderTexture(800, 600, PIXI.SCALE_MODES.LINEAR, 1))
    var sprite = new PIXI.Sprite(rt)

    stage.addChild(sprite)
    background.filters = [new PIXI.SpriteMaskFilter(sprite)]
    background.mask = fovMask
    stage.addChild(fovMask)
    stage.addChild(backgroundInFov)
    stage.addChild(background)

    store.dispatch({
        type: 'ADD_STATIC_LIGHT',
        payload: { id: 1, x: 120, y: 120, }
    })
    store.dispatch({
        type: 'ADD_STATIC_LIGHT',
        payload: { id: 2, x: 280, y: 480, }
    })
    store.dispatch({
        type: 'ADD_STATIC_LIGHT',
        payload: { id: 3, x: 600, y: 200, }
    })

    $.get('map.svg').done((data) => {
        store.dispatch({
            type: 'MAP_LOADED',
            payload: data,
        })
    })

    store.dispatch({
        type: 'SPAWN_PLAYER',
        payload: { id: 1, name: 'Threlgor', team: 'blue', }
    })

    store.dispatch({
        type: 'CONTROLE_PLAYER',
        payload: 0,
    })

    store.subscribe(() => {
        scene.updateScene(store.getState(), stage, background, backgroundInFov, container, fovMask, physicEngine)
        physicSystem.update(store.getState())
    })

    const ws = new WebSocket('ws://' + window.document.location.host.replace(/:.*/, '') + ':8000')
    ws.onmessage = (event) => {
        scene.updateRemoteEntities(stage, physicEngine, JSON.parse(event.data))
    }

    animate()

    function animate() {
        ReactDOM.render(
          <Provider store={store}>
            {
              <JSONTree data={store.getState()} />
            }
          </Provider>, document.getElementById('app')
        )

        store.dispatch({
            type: 'TICK',
        })

        meter.tick()
        background.clear()

        Engine.update(physicEngine, 16.666)

        physicSystem.tick(store.getState(), store.dispatch)

        scene.tick(store.getState(), stage, renderer, fovMask, physicEngine, ws, store.dispatch)

        renderer.render(container, rt)
        renderer.render(stage)
        requestAnimationFrame(animate)
    }
}

window.addEventListener('keydown', function (e) {
    store.dispatch({ type: 'keydown', payload: e.keyCode })
})

window.addEventListener('keyup', function (e) {
    store.dispatch({ type: 'keyup', payload: e.keyCode })
})
