import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

type Table = { table: string; filter?: string };

/**
 * Subscribe to row changes on one or more tables and run `onChange` on each
 * event. The channel is torn down on unmount.
 */
export function useRealtime(channelName: string, tables: Table[], onChange: () => void) {
  const key = JSON.stringify(tables);
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const channel = supabase.channel(channelName);
    for (const entry of JSON.parse(key) as Table[]) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: entry.table,
          ...(entry.filter ? { filter: entry.filter } : {}),
        },
        () => handler.current(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, key]);
}
