import React from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import { StatusPill, type UiStatus } from './StatusPill';

export function HeaderBar(props: {
  status: UiStatus;
  batchLabel?: string | null;
}) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={6}>
        <Group gap={10} align="center">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(76,125,255,0.22), rgba(76,125,255,0.06))',
              border: '1px solid rgba(76,125,255,0.25)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <IconBolt size={18} color="rgba(255,255,255,0.92)" />
          </div>
          <div>
            <Title order={2} style={{ letterSpacing: -0.4 }}>
              Media Saver
            </Title>
            <Text size="sm" c="dimmed">
              Pro desktop utility • yt-dlp + ffmpeg • personal/allowed use only
            </Text>
          </div>
        </Group>
      </Stack>

      <StatusPill status={props.status} rightLabel={props.batchLabel ?? null} />
    </Group>
  );
}



