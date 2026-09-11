import { NextRequest, NextResponse } from 'next/server';
import { providerResolver } from '@/lib/providers/resolver';

export async function GET(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId') || undefined;

    const streams = await providerResolver.resolveStreams(params.contentId, episodeId);

    if (!streams || streams.length === 0) {
      return NextResponse.json(
        {
          error: 'No active authorized streams available for this title.',
          code: 'STREAM_UNAVAILABLE',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      contentId: params.contentId,
      episodeId,
      streams,
    });
  } catch (error) {
    console.error('Error in stream resolution API:', error);
    return NextResponse.json(
      {
        error: 'Failed to resolve stream metadata from providers.',
        code: 'RESOLVER_ERROR',
      },
      { status: 500 }
    );
  }
}
