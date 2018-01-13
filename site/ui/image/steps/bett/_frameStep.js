/* global require, console */

const Timeline = require('gsap/src/minified/TimelineMax.min');

import CanvasUtils from '../../_canvasUtils';

export default class FrameStep {

    constructor(imageElement, canvas, context, duration) {

        this.imageElement = imageElement;
        this.canvas = canvas;
        this.context = context;
        this.killAnimation = false;
        this.canvasUtils = new CanvasUtils(imageElement, canvas, context);
        this.borderWidth = 28;

        this.draw(duration);

    }

    kill() {
        this.killAnimation = true;
        this.imageElement = null;
        this.canvas = null;
        this.context = null;
    }

    draw(duration = 2) {

        if(this.killAnimation) {
            return;
        }

        this.canvasUtils.redrawCurrentCanvas();

        const height = this.canvas.height;

        const timeline = new Timeline({
            onComplete: () => {
                this.imageElement.killTween(timeline);
            }
        });

        let currActive = null;

        timeline.to(this, duration, {
            onStart: () => {
                currActive = timeline.getActive()[0];
                this.imageElement.tweens.push(currActive);
            },
            onUpdate: () => {
                this.canvasUtils.redrawCurrentCanvas();
                const progress = currActive.progress();
                this.drawOverlay(progress, height);
                this.drawDots(progress, height);
                this.drawBorder(progress, height);
            }
        });

        this.imageElement.timelines.push(timeline);

    }

    drawDots(progress, height = 112, callback = null) {

        const width = this.canvas.width;

        const hSpacing = 25;
        const vSpacing = 0;

        const radius = 10;

        const rows = (height / (vSpacing + (radius * 2)));
        const cols = (width / (hSpacing + (radius * 2)));

        for(let rowI = 0; rowI < rows; rowI++) {

            const offset = (0 === rowI % 2) ? (hSpacing / 2) + radius : 0;

            for(let colI = 0; colI < cols; colI++) {
                this.drawDot(offset + (colI * (hSpacing + (radius * 2))), rowI * (vSpacing + (radius * 2)), radius, `rgba(170, 170, 170, ${ progress })`);
            }

        }


        if(callback) {
            callback();
        }

    }

    drawOverlay(progress, height = 112) {
        const alpha = 0.56 * progress;
        const color = `rgba(255, 255, 255, ${ alpha })`;
        this.context.save();
        this.context.rect(0, 0, this.canvas.width, height);
        this.context.fillStyle = color;
        this.context.fill();
        this.context.restore();
    }

    drawDot(x, y, radius, color = 'rgba(170, 170, 170, 1)') {

        this.context.save();
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, 2 * Math.PI, false);
        this.context.fillStyle = color;
        this.context.fill();
        this.context.restore();
    }

    drawBorder(progress, height = 112, callback = null) {
        console.info(this.context);
        this.context.save();
        this.context.globalCompositeOperation = 'source-over';
        this.context.rect(0, 0, this.canvas.width, height);
        this.context.strokeStyle = '#000000';
        this.context.lineWidth = this.borderWidth;
        this.context.stroke();
        this.context.restore();

        if(callback) {
            callback();
        }

    }

}