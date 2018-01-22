/* global single, document, require, states, requestAnimationFrame, Promise */

'use strict';

import PanelComponent from '../panelComponent';
import * as geometryUtils from '../_geometryUtils';
import * as imageConst from './_imageConst';
import CanvasUtils from './_canvasUtils';
import FaceStep from './steps/_faceStep';
import ZoomStep from './steps/_zoomStep';
import * as animationUtils from '../_animationUtils';
import * as faceUtils from '../_faceUtils';
import flashStep from './steps/_flashStep';
import EmotionStep from './steps/_emotionStep';
import groupCircleStep from './steps/bett/_groupCircleStep';
import backgroundStep from './steps/bett/_backgroundStep';
import multiAuraStep from './steps/bett/_multiAuraStep';
import haloStep from './steps/bett/_haloStep';
import FrameStep from './steps/bett/_frameStep';
import chromeStep from './steps/next/_chromeStep';

const Timeline = require('gsap/src/minified/TimelineMax.min');

export default class ImageElement extends PanelComponent {
    constructor(imgPath = null, jsonPath = null, readyCallback = null) {
        super();

        this.canvasWidth = single ? imageConst.BACKEND_CANVAS_WIDTH : imageConst.CANVAS_WIDTH;
        this.canvasHeight = single ? imageConst.BACKEND_CANVAS_HEIGHT : imageConst.CANVAS_HEIGHT;

        this.canvas = null;
        this.context = null;

        this.width = 0;
        this.height = 0;

        this.currentFrame = 0;

        this.imageElement = null;

        this.scrimAlpha = 0;

        this.backgroundFill = 'blue';

        this.eyeMidpoints = [];
        this.eyesMidpoint = new geometryUtils.Point();
        this.allEyesCenter = new geometryUtils.Point();

        this.canvasSnapshot = null;

        this.offsetX = 0;
        this.offsetY = 0;

        this.image = null;

        this.resizedImageOffset = null;
        this.subRect = {};

        this.imageScale = 1;

        this.faceBounds = null;

        this.facesAndEmotions = [];
        this.curFace = [];
        this.hexR = 1;

        this.tweens = [];
        this.timelines = [];

        this.treatments = {};

        this.resizedImageScale = 0;

        this.isDrawing = false;
        this.popArtAnimations = null;
        this.readyCallback = readyCallback;

        this.hexVertices = [];

        this.allDone = false;
        this.shapesInit = false;

        this.init();

    }

    load() {
        return Promise.all([this.frameStep.load()]);
    }

    init() {

        if (this.imageElement) {
            return;
        }

        this.imageElement = document.createElement('div');
        this.imageElement.classList.add('image');

        this.canvasUtils = new CanvasUtils(this);

        this.canvas = this.canvasUtils.createHiDPICanvas(
            this.canvasWidth,
            this.canvasHeight,
            4);

        this.canvas.classList.add('image-canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        this.imageElement.appendChild(this.canvas);

        this.context = this.canvas.getContext('2d');

        this.faceStep = new FaceStep(this, this.canvas, this.context);
        this.zoomStep = new ZoomStep(this, this.canvas, this.context);
        this.frameStep = new FrameStep(this, this.canvas, this.context);

        animationUtils.setSmoothing(this.context);

    }

    loadImage(json, imgPath) {
        if(!json) {
            return;
        }

        this.canvasUtils.loadImage(json, imgPath);

    }

    startAnimations() {
        if(!this.facesAndEmotions.length) return;

        if(single) {
            this.zoom(0, true);
            this.startPopArtAnimations();
        } else {
            super.startAnimations(() => {
                this.startPopArtAnimations();
            })
        }

    }

    startPopArtAnimations() {

        this.popArtAnimations = new Timeline({
            onComplete: () => {
                super.killTimeline(this.popArtAnimations);
            }
        });

        const popArtAnimStates = this.faces.length === 1 ? states.STATES_AURA_SINGLE : states.STATES_AURA_MULTIPLE;

        popArtAnimStates.forEach((state) => {
            this.popArtAnimations.to(this, Math.max(state.DURATION, animationUtils.MIN_DURATION), {
                onStart: () => {
                    if(this[state.NAME]) {
                        this[state.NAME](state.DURATION);
                    } else {
                        this.pause(state.DURATION);
                    }
                }
            })
        });

        this.timelines.push(this.popArtAnimations);

    }

    reinitFaces(json) {
        super.reinitFaces(json, () => {
            if (this.particles) {
                this.particles.kill();
                this.particles = null;
            }

            const stepsToKill = [this.zoomStep, this.faceStep, this.flashStep, this.emotionStep, this.backgroundStep, this.chromeStep];
            stepsToKill.forEach((step) => {
                if (step) {
                    step.kill();
                    step = null;
                }
            });

            this.faceStep = new FaceStep(this, this.canvas, this.context);
            this.zoomStep = new ZoomStep(this, this.canvas, this.context);

            this.backgroundFill = 'blue';
            this.totalEmotions = 0;
            this.imageScale = 1;
            this.hexVertices = [];
            this.facesAndEmotions = faceUtils.generateFacesAndEmotions(this.faces);
            this.facesAndStrongestEmotions = faceUtils.generateFacesAndEmotions(this.faces, true);
            this.treatments = animationUtils.generateTreatments(this.facesAndStrongestEmotions);
            this.eyeMidpoints = faceUtils.generateEyeMidpoints(this.faces);
            this.faceBounds = faceUtils.generateFaceBounds(this.faces);
            this.allEyesCenter = faceUtils.generateAllEyesCenter(this.faces);
            let totalEmotions = 0;
            this.facesAndEmotions.forEach((face) => {
                totalEmotions += Object.keys(face).length;
            });
            this.noEmotions = totalEmotions === 0;
            this.totalEmotions = totalEmotions;
            this.scrimAlpha = 0;
            this.fills = [];
            this.vignettePattern = null;
            this.resizedImageOffset = null;
            this.resizedImageScale = 0;
            this.popArtAnimations = null;
            this.offsetX = 0;
            this.offsetY = 0;
            this.allDone = false;
            this.currentFrame = 0;
            this.shapesInit = false;
        });
    }

    // Animation actions

    ifNotDrawing(callback) {
        requestAnimationFrame(() => {
            if (this.isDrawing) {
                this.imageElement.ifNotDrawing(callback);
            } else {
                callback();
            }
        });
    }

    flash(duration = 0) {
        this.flashStep = new flashStep(this, this.canvas, this.context, duration);
    }

    zoom(duration = 0, zoomOut) {
        this.zoomStep.zoom(duration, zoomOut);
    }

    face(duration = 0) {
        this.faceStep.face(duration);
    }

    forehead(duration = 0) {
        this.faceStep.forehead(duration);
    }

    eyes(duration = 0) {
        this.faceStep.eyes(duration);
    }

    ears(duration = 0) {
        this.faceStep.ears(duration);
    }

    nose(duration = 0) {
        this.faceStep.nose(duration);
    }

    mouth(duration = 0) {
        this.faceStep.mouth(duration);
    }

    chin(duration = 0) {
        this.faceStep.chin(duration);
    }

    allFeatures(duration = 0) {
        this.faceStep.allFeatures(duration);
    }

    zoomOut(duration = 0) {
        this.zoomStep.zoom(duration, true);
    }

    emotion(duration = 0) {
        this.emotionStep = new EmotionStep(this, this.canvas, this.context, duration);
    }

    chrome(duration = 0) {
        this.chromeStep = new chromeStep(this, this.canvas, this.context, duration);
    }

    animateInBackground(duration = 0) {
        if (this.facesAndEmotions.length !== 1) {
            this.groupCircleStep = new groupCircleStep(this, this.canvas, this.context, duration);
        } else {
            this.backgroundStep = new backgroundStep(this, this.canvas, this.context, duration);
        }
    }

    animateInFrame(duration = 0) {
        this.frameStep.draw(duration);
    }

    animateInHalo(duration = 0) {
        this.haloStep = new haloStep(this, this.canvas, this.context, duration);
    }

    animateInHaloMulti(duration = 0) {
        this.multiAuraStep = new multiAuraStep(this, this.canvas, this.context, duration);
    }

}