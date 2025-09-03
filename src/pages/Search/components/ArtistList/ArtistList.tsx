import type { Artist } from '../../../../models/help/artist';
import MemoArtistInfo from '../ArtistInfo/ArtistInfo';

type ArtistListProps = {
  artists: Artist[];
};

const ArtistList = ({ artists }: ArtistListProps) => {
  return (
    <ul>
      {artists.map((artist) => {
        return <MemoArtistInfo key={artist.name} artist={artist} />;
      })}
    </ul>
  );
};

export default ArtistList;
