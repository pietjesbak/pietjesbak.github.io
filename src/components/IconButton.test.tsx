import * as enzyme from 'enzyme';
import * as React from 'react';

import IconButton, { IconButtonBehavour } from './IconButton';

jest.mock('react-simple-tooltip', () => {
    return {
        'default': 'mock-tooltip'
    }
});

describe('<IconButton />', () => {
    it('Renders a big button', () => {
        const fn = jest.fn();
        const button = enzyme.shallow(<IconButton icon="globe" text="Home" action={fn} />);

        expect(button).toMatchSnapshot('big button');
        button.find('button').simulate('click');
        expect(fn).toBeCalled();
    });

    it('Renders a small button', () => {
        (window as any).innerWidth = 500;

        const fn = jest.fn();
        const button = enzyme.mount(<IconButton icon="globe" text="Home" action={fn} />);

        expect(button).toMatchSnapshot('small button');
        button.find('button').simulate('click');
        expect(fn).toBeCalled();
    });

    it('Renders a big button regardless of screen size', () => {
        (window as any).innerWidth = 500;

        const fn = jest.fn();
        const button = enzyme.shallow(<IconButton icon="globe" text="Home" action={fn} behaviour={IconButtonBehavour.BIG} />);

        expect(button).toMatchSnapshot('big button');
        button.find('button').simulate('click');
        expect(fn).toBeCalled();
    });

    it('Renders a small button regardless of screen size', () => {
        (window as any).innerWidth = 1920;

        const fn = jest.fn();
        const button = enzyme.shallow(<IconButton icon="globe" text="Home" action={fn} behaviour={IconButtonBehavour.SMALL} />);

        expect(button).toMatchSnapshot('small button');
        button.find('button').simulate('click');
        expect(fn).toBeCalled();
    });
});
