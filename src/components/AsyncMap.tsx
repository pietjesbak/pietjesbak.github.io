import * as Loadable from 'react-loadable';
import { TextPlaceholder } from './TextPlaceholder'; 

export default Loadable({
  loader: () => import('../SimpleMap'),
  loading: TextPlaceholder,
});
