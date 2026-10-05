import "../../../../src/app/globals.css";
import CampaignLayout, {
  metadata,
  viewport,
} from "../../../../src/app/campanas/layout";
export { metadata, viewport };
export default function Layout({ children }) {
  return (
    <html lang="es">
      <body>
        <CampaignLayout>{children}</CampaignLayout>
      </body>
    </html>
  );
}
