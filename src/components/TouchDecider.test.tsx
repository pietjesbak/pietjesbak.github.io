import * as enzyme from 'enzyme';
import * as React from 'react';

import TouchDecider from './TouchDecider';

describe('<TouchDecider />', () => {
    it('Renders the default text', () => {
        const component = enzyme.mount(<TouchDecider />);

        expect(component).toMatchSnapshot();
        component.unmount();
    });

    it('Doesnt render the text when the screen is being touched', () => {
        const component = enzyme.mount(<TouchDecider />);
        const canvas = component.find('canvas').getDOMNode();

        const event = new TouchEvent('touchstart', {
            touches: [
                {
                    identifier: 1,
                    pageX: 10,
                    pageY: 10,
                    target: canvas
                }
            ],
            changedTouches: [
                {
                    identifier: 1,
                    pageX: 10,
                    pageY: 10,
                    target: canvas
                }
            ]
        } as any);
        canvas.dispatchEvent(event);

        // Why is this required?
        component.update();

        expect(component).toMatchSnapshot();
        component.unmount();
    });
});
