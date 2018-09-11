import * as React from 'react';
import * as Loadable from 'react-loadable';
import { TextPlaceholder } from './TextPlaceholder'; 

export default Loadable({
  loader: () => import('../SimpleMap'),
  loading: (props) => {
    return <TextPlaceholder renderTitle={false} paragraphSize={8} error={props.error ? 'Fout bij het laden van de kaart.' : undefined} />
  },
});
