/* global require, Image, console */

import { bett } from '../../../_assets';

const Timeline = require('gsap/src/minified/TimelineMax.min');

import CanvasUtils from '../../_canvasUtils';

export default class FrameStep {

    constructor(imageElement, canvas, context, duration) {

        this.imageElement = imageElement;
        this.canvas = canvas;

        this.scale = this.canvas.width / this.imageElement.width;

        this.context = context;
        this.killAnimation = false;
        this.canvasUtils = new CanvasUtils(imageElement, canvas, context);
        this.borderWidth = this.scaled(40);
        this.circlePadding = this.scaled(200);

        this.bettFrame = new Image();
        this.bettFrame.src = bett.faceCircle;

        this.emotions = {};

        for(const emotion in bett.emotions) {

            this.emotions[emotion] = {
                icon: new Image(),
                color: bett.emotions[emotion].color
            };

            this.emotions[emotion]['icon'].src = bett.emotions[emotion].icon;

        }

        console.info(this.emotions);

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
        this.drawResults(progress);
        this.drawBorder(progress, height);
    }

    drawDots(progress, height = 112) {

        const width = this.canvas.width;

        const hSpacing = this.scaled(25);
        const vSpacing = 0;

        const radius = this.scaled(10);

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

        const width = (bounds.right - bounds.left) * this.scale;

        const x = this.imageElement.eyesMidpoint.x;
        const y = this.imageElement.eyesMidpoint.y;

        const radius = ((width / 2) + this.circlePadding) * progress;

        this.context.arc(x, y, radius, 2 * Math.PI, false);
        this.context.fill();

        this.context.closePath();
        this.context.restore();

        this.context.drawImage(this.bettFrame, x - ((width + (this.circlePadding * 2)) / 2), y - ((width + (this.circlePadding * 2)) / 2), width + (this.circlePadding * 2), width + (this.circlePadding * 2));

    }

    drawResults(/*progress = 0*/) {

        this.context.save();
        this.context.beginPath();

        const y = this.scaled(2200);
        const width = this.scaled(1000);
        const height = this.scaled(150);

        const emotions = this.mapEmotions(this.imageElement.facesAndStrongestEmotions);

        this.context.rect(0, y, width, height);
        this.context.strokeStyle = '#000000';
        this.context.lineWidth = this.borderWidth / 1.5;
        this.context.fillStyle = emotions.barColor;

        this.context.shadowOffsetX = 5;
        this.context.shadowOffsetY = 5;
        this.context.shadowBlur= 10;
        this.context.shadowColor = 'rgba(0, 0, 0, 0.5)';

        this.context.stroke();
        this.context.fill();

        this.context.closePath();
        this.context.restore();

        const padding = this.scaled(100);

        const iconHeight = height - 20;
        const iconWidth = iconHeight;

        let index = 0;
        const lMargin = this.scaled(120);

        for(const emotion in this.emotions) {

            const icon = this.emotions[emotion].icon;

            const iconY = y + (height / 2) - (iconHeight / 2);
            const iconX = (index === 0) ? (lMargin) : ((padding + iconWidth) * index) + lMargin;

            // Draw the faces
            this.context.drawImage(icon, iconX, iconY, iconWidth, iconHeight);

            if(emotions.levels[emotion] > 0) {
                this.drawResultBars(this.context, iconX, y, iconWidth, emotions.levels[emotion]);
            }

            index++;

        }

        this.context.closePath();
        this.context.restore();

    }

    drawResultBars(context, x, y, width, result) {

        const height = this.scaled(20);
        const bMargin = this.scaled(30);
        const bPadding = this.scaled(20);
        const bars = result / 20;

        context.save();
        context.beginPath();

        for(let i = 0; i < bars; i++) {
            const barY = (i === 0) ? y - (height + bMargin) : (y - (height + bMargin)) - ((height + bPadding) * i);
            context.rect(x, barY, width, height);
            context.fillStyle = '#000000';
            context.fill();
        }

        context.closePath();
        context.restore();
    }

    mapEmotions(faceAndEmotions) {

        const output = {
            levels: {
                joy: 0,
                sorrow: 0,
                anger: 0,
                confusion: 0
            },
            barColor: '#000000'
        };

        const levels = {
            UNKNOWN: 0,
            VERY_UNLIKELY: 20,
            UNLIKELY: 40,
            POSSIBLE: 60,
            LIKELY: 80,
            VERY_LIKELY: 100
        };

        faceAndEmotions.forEach((face) => {

            for(const emotion in face) {
                output.levels[emotion.toLowerCase()] = Math.max(levels[face[emotion]], output.levels[emotion.toLowerCase()])
            }

        });

        // Get first color
        const dominant = { emotion: 'unknown', level: 0};

        for(const emotion in output.levels) {
            if(output.levels[emotion] > dominant.level) {
                dominant.emotion = emotion;
                dominant.level = output.levels[emotion];
            }
        }

        output.barColor = (dominant.emotion === 'unknown') ? '#FFFFFF' : this.emotions[dominant.emotion].color;

        return output;
    }

    scaled(value) {
        return value * this.scale;
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