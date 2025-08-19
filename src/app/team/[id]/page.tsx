import { PageLayout } from "@/components/PageLayout";
import { TeamDetail } from "@/features/teams/components/TeamDetail";

interface TeamDetailPageProps {
	params: {
		id: string;
	};
}

export default function TeamDetailPage({ params }: TeamDetailPageProps) {
	return (
		<PageLayout>
			<TeamDetail teamId={params.id} />
		</PageLayout>
	);
}
