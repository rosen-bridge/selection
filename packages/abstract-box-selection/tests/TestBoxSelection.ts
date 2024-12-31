import { AbstractBoxSelection, BoxInfo } from '../lib';

class TestBoxSelection extends AbstractBoxSelection<string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getBoxInfo = (box: string): BoxInfo => {
    throw Error('Not mocked');
  };
}

export default TestBoxSelection;
