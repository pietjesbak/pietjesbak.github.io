import '../css/TouchDecider.css';

import * as React from 'react';
import { shuffle } from '../Helpers';

interface TouchObj {
    size: number;
    minSize: number;
    color: string;
    x: number;
    y: number;
    angle: number;
}

interface State {
    width: number;
    height: number;
    noTouch: boolean;
}

class TouchDecider extends React.Component<{}, State> {
    /**
     * Colors for the different touches.
     */
    colors = ['#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab', '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047', '#7cb342', '#c0ca33', '#ffb300', '#fb8c00', '#f4511e', '#6d4c41', '#757575', '#546e7a', '#59547a'];

    /**
     * Reference for drawing on the canvas.
     */
    ref: React.RefObject<HTMLCanvasElement>;

    /**
     * Reference to the canvas parent so we know how big to make the canvas.
     */
    parent: React.RefObject<HTMLDivElement>;

    /**
     * Keeps track of whether the component is mounted so we know when to animate it.
     */
    mounted: boolean;

    /**
     * The current touches on the canvas.
     */
    touches: Touch[] = [];

    /**
     * The state of the touches in the previous frame.
     */
    touchCache: Map<number, TouchObj> = new Map();

    /**
     * An array of touches that are currenly fading out.
     */
    lingeringTouches: TouchObj[] = [];

    /**
     * The identifier of the winning touch.
     */
    winner?: number;

    /**
     * The previous time the canvas was rendered.
     */
    lastTime: number;

    /**
     * Used to wait for all contestants to join before growing the circles.
     */
    timeout: number;

    constructor(props: {}) {
        super(props);

        this.ref = React.createRef();
        this.parent = React.createRef();
        this.mounted = false;

        this.state = {
            width: 200,
            height: 200,
            noTouch: true
        }
    }

    componentDidMount() {
        this.mounted = true;

        this.onParentResize();
        window.addEventListener('resize', this.onParentResize);
        this.ref.current!.addEventListener('touchstart', this.touchStart);
        this.ref.current!.addEventListener('touchend', this.touchEnd);

        this.drawCanvas(0);
    }

    onParentResize = () => {
        this.setState({
            width: this.parent.current!.clientWidth,
            height: this.parent.current!.clientHeight
        });
    }

    componentWillUnmount() {
        this.mounted = false;
        window.removeEventListener('resize', this.onParentResize);
        this.ref.current!.removeEventListener('touchstart', this.touchStart);
        this.ref.current!.removeEventListener('touchend', this.touchEnd);
    }

    drawCanvas: FrameRequestCallback = (t) => {
        // Figure out time passed since last render.
        let delta = 1 / 60;
        if (this.lastTime === undefined) {
            if (t !== 0) {
                this.lastTime = t;
            }
        } else {
            delta = t - this.lastTime;
            this.lastTime = t;
        }

        // Counter start growing the circles after 1 second.
        if (this.timeout < 1000) {
            this.timeout += delta;
        }

        if (this.mounted) {
            const radius = Math.max(this.state.width, this.state.height);
            const offsetLeft = ((this.ref.current!.offsetParent) as HTMLDivElement).offsetLeft;
            const offsetTop = ((this.ref.current!.offsetParent) as HTMLDivElement).offsetTop;

            const ctx = this.ref.current!.getContext('2d');
            if (ctx !== null) {
                ctx.clearRect(0, 0, this.state.width, this.state.height);
                ctx.globalCompositeOperation = 'screen';

                // Draw all lingering circles that should fade away.
                for (let i = this.lingeringTouches.length - 1; i >= 0; i--) {
                    const touch = this.lingeringTouches[i];

                    ctx.beginPath();
                    ctx.arc(touch.x - offsetLeft, touch.y - offsetTop, touch.size, 0, Math.PI * 2);
                    ctx.fillStyle = touch.color;
                    ctx.fill();

                    touch.size -= 10;
                    if (touch.size <= 0) {
                        this.lingeringTouches.splice(i, 1);
                    }
                }

                // Draw and grow all currently touched areas.
                for (let i = 0; i < this.touches.length; i++) {
                    const touch = this.touches[i];
                    const state = this.touchCache.get(touch.identifier)!;

                    ctx.beginPath();
                    ctx.arc(touch.pageX - offsetLeft, touch.pageY - offsetTop, state.size, 0, Math.PI * 2);
                    ctx.fillStyle = state.color;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(touch.pageX - offsetLeft, touch.pageY - offsetTop, state.size, state.angle, state.angle + this.timeout / 1000 * Math.PI * 2);
                    ctx.strokeStyle = state.color;
                    ctx.lineWidth = 10;
                    ctx.stroke();

                    if ((this.winner === undefined || touch.identifier === this.winner) && this.timeout >= 1000) {
                        if (state.size < radius * 1.1) {
                            state.size += radius * Math.sqrt(state.size) * 0.00005 * delta;
                            state.size *= 1 - (i / 150);
                        }
                    } else {
                        state.size = Math.max(state.size - 10, state.minSize);
                    }

                    if (state.size > radius * 0.9 && this.winner === undefined) {
                        this.winner = touch.identifier;
                    }
                }

                requestAnimationFrame(this.drawCanvas);
            }
        }
    }

    handleTouches(list: TouchList) {
        this.touches = [];
        for (let i = 0; i < list.length; i++) {
            this.touches.push(list[i]);
        }
        shuffle(this.touches);

        this.setState({
            noTouch: this.touches.length === 0
        });
    }

    touchStart = (e: TouchEvent) => {
        e.preventDefault();

        if (this.touches.length === 0) {
            shuffle(this.colors);
            this.winner = undefined;
        }

        if (this.winner === undefined) {
            this.timeout = 0;
        }

        const offsetLeft = ((this.ref.current!.offsetParent) as HTMLDivElement).offsetLeft;
        const offsetTop = ((this.ref.current!.offsetParent) as HTMLDivElement).offsetTop;

        this.handleTouches(e.touches);
        const touch = e.changedTouches[0];
        this.touchCache.set(touch.identifier, {
            size: 20 * 2,
            minSize: 20 * 2,
            color: this.colors[touch.identifier % this.colors.length],
            x: touch.pageX,
            y: touch.pageY,

            // -atan2(x - centerx, y - centery) - 90degrees
            angle: -Math.atan2(touch.pageX - offsetLeft - this.state.width / 2, touch.pageY - offsetTop - this.state.height / 2) - Math.PI / 2
        });
    }

    touchEnd = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const state = this.touchCache.get(touch.identifier)!;
        this.lingeringTouches.push(state);

        this.handleTouches(e.touches);
        this.touchCache.delete(touch.identifier);
    }

    render() {
        return (
            <div className="canvas-parent" ref={this.parent}>
                {this.state.noTouch ? <span className="touchdecider-message">Raak het scherm met 1 vinger aan om te beslissen wie begint.</span> : null}
                <canvas className="touchdecider-canvas" width={this.state.width} height={this.state.height} ref={this.ref} />
            </div>
        );
    }
}

export default TouchDecider;
