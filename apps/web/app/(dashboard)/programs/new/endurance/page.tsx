import { NewProgramPageContent } from "../load-new-program-data";

// Dayanıklılık programı oluşturma — bkz. new-program-client.tsx variant="endurance".
// Sporcu erişimi middleware + (dashboard)/layout athlete guard'ında
// "/programs/new/" önekiyle kapalı.
export default async function NewEnduranceProgramPage() {
  return <NewProgramPageContent variant="endurance" />;
}
