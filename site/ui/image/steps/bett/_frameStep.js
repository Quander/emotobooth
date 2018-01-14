/* global require */

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
        this.circlePadding = 50;

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

        if(duration === 0) {
            this.drawFrame(1);
            return;
        }

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
                const progress = currActive.progress();
                this.drawFrame(progress);
            }
        });

        this.imageElement.timelines.push(timeline);

    }

    drawFrame(progress = 1) {

        const height = this.canvas.height;

        this.canvasUtils.redrawCurrentCanvas();
        this.drawOverlay(progress, height);
        this.drawDots(progress, height);
        this.cutHole(progress);
        this.drawBorder(progress, height);
    }

    drawDots(progress, height = 112) {

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

    }

    drawOverlay(progress, height = 112) {
        const alpha = 0.56 * progress;
        const color = `rgba(255, 255, 255, ${ alpha })`;
        this.context.save();
        this.context.beginPath();
        this.context.rect(0, 0, this.canvas.width, height);
        this.context.fillStyle = color;
        this.context.fill();
        this.context.closePath();
        this.context.restore();
    }

    cutHole(progress = 0) {

        this.context.save();
        this.context.beginPath();

        const bounds = this.imageElement.faceBounds;
        const scale = this.canvas.width / this.imageElement.width;
        const width = (bounds.right - bounds.left) * scale;

        const x = this.imageElement.eyesMidpoint.x;
        const y = this.imageElement.eyesMidpoint.y;

        const radius = ((width / 2) + this.circlePadding) * progress;

        this.context.arc(x, y, radius, 2 * Math.PI, false);
        this.context.fill();

        this.context.closePath();
        this.context.restore();

    }

    drawDot(x, y, radius, color = 'rgba(170, 170, 170, 1)') {

        this.context.save();
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, 2 * Math.PI, false);
        this.context.fillStyle = color;
        this.context.fill();
        this.context.closePath();
        this.context.restore();
    }

    drawBorder(progress, height = 112) {

        this.context.save();
        this.context.beginPath();
        this.context.globalCompositeOperation = 'source-over';
        this.context.rect(0, 0, this.canvas.width, height);
        this.context.strokeStyle = '#000000';
        this.context.lineWidth = this.borderWidth;
        this.context.stroke();
        this.context.closePath();
        this.context.restore();

    }

}