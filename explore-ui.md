# Explore Point

We want a UI that allows us to debug our points in time for TN.

What we know:

- we have get record, get index, get index change
- get index change depends on get index, which depends on get record
- get index change:
- get index: the record of a date by a 
- get record: the exact record
- our streams might be either composed or primitives
- taxonomy is the definition of a composed stream in terms of compositions


what we want:

to be able to debug our points to discover how that was composed until that final values.

Important note: this is for only my own usage, so it doesn't need to be very production ready UI. High ROI is the priority.

pages we need:

query stream:
- 3 modes (record, index, index change), which the input is different depending
- shows the stream we're querying, but also one level up of taxonomies if it's a composed stream
- it's a table
- we can toggle between time format (unix or ISO)
- if we click on a cell, we go to explore point
- if we hover for 3 seconds, we show a tooltip depending on the mode
- on headers, on other streams that are not the one we're querying, we also put on parenthesis the weight of the stream


explore point:
- picks only one point to explore, using that time in from and to
- also has a input, defaulting to 1, to set how many levels of composition to show
- has a tree structure of that point, up to that level. As dates doesn't necessarily match from the query, they show mini tables with the stream value, the weight, and the date of that point on that stream

tooltip description:
- for index, shows the used base date, the value of the base date, and the current value
- for index change, just yield to be defined

additional notes:
at input we should have a way to choose the provider to be queried, and also the private key in text form
default private key: 0000000000000000000000000000000000000000000000000000000000000001, default provider: https://gateway.mainnet.truf.network

### Revised High-ROI Development Plan

This plan refines the original specification based on the following key decisions:

1.  **Tooltip Simplification:** The feature to fetch and display the base value used for `getIndex` calculations will be deferred (`TBD`). The tooltip will only show information already available on the client side.
2.  **"Explore Point" Logic:** When exploring a composed stream's data point, child stream values will be determined by finding the last available record at or before the parent's event time, simplifying the alignment logic.
3.  **Query Behavior Clarifications:**
    *   **Latest Value Queries:** When a "get" function (e.g., `getRecord`, `getIndex`) is called without time range parameters (`from`/`to`), it will return the latest available record for the stream.
    *   **Point-in-Time Queries:** When querying for a specific timestamp that has no exact record, the query will return the most recent record *before* that timestamp. For example, a query for time `Y` will return the latest record where `eventTime <= Y`. This applies to both the main query view and the exploration of child streams.

---

### 1. Necessary Functions (Updated)

With the new constraints, we need to ensure the following specific function is available in our SDK's `Action` class.

#### a. Essential for "Explore Point": `get_last_record`

To explore a data point of a composed stream at a specific `eventTime`, we need to find the corresponding value for each child component. Since child streams may not have a record at that exact timestamp, we must fetch the most recent value *at or before* that time. The `get_last_record` action is designed for this.

**Action Required:** Ensure your SDK's `Action` class exposes this method.

```typescript
// Add to: src/contracts-api/action.ts inside the `Action` class

/**
 * Returns the last record of the stream before a given timestamp.
 */
public async getLastRecord(
  input: { stream: StreamLocator; before: number; frozenAt?: number }
): Promise<StreamRecord | null> {
  const result = await this.call<{ event_time: number; value: string }[]>(
    "get_last_record",
    {
      $data_provider: input.stream.dataProvider.getAddress(),
      $stream_id: input.stream.streamId.getId(),
      $before: input.before,
      $frozen_at: input.frozenAt,
    }
  );
  return result
    .mapRight((res) => (res.length > 0 ? res[0] : null))
    .mapRight((row) =>
      row
        ? {
            eventTime: row.event_time,
            value: row.value,
          }
        : null
    )
    .throw();
}
```

#### b. Other Required Functions (No Change)

You will still need the following as originally planned:

*   `client.getListStreams()`
*   `client.loadAction()`
*   `client.loadComposedAction()`
*   `streamAction.getRecord()`
*   `streamAction.getIndex()`
*   `streamAction.getIndexChange()`
*   `streamAction.getType()`
*   `composedAction.describeTaxonomies()`

---

### 2. UI Implementation Plan for High ROI (Refined)

This section updates the implementation strategy with more detailed, actionable steps.

#### a. State Management: Global SDK Client

To avoid passing the `TNClient` instance through multiple component layers (prop-drilling), we will use a React Context. This makes the initialized client globally available to all components that need it.

**Action Required:** Create a context provider.

**File: `src/contexts/TNClientProvider.tsx`**
```typescript
import { createContext, useContext, useState, ReactNode } from 'react';
import { BrowserTNClient } from '@trufnetwork/sdk-js';
import { Wallet } from 'ethers';

// Type for the context value, including the client and a function to connect
interface TNClientContextType {
  client: BrowserTNClient | null;
  connect: (privateKey: string, endpoint: string, chainId: string) => void;
}

const TNClientContext = createContext<TNClientContextType | null>(null);

export const useTNClient = () => {
  const context = useContext(TNClientContext);
  if (!context) throw new Error('useTNClient must be used within a TNClientProvider');
  return context;
};

export const TNClientProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<BrowserTNClient | null>(null);

  const connect = (privateKey: string, endpoint: string, chainId: string) => {
    try {
      const wallet = new Wallet(privateKey);
      const newClient = new BrowserTNClient({
        endpoint,
        signerInfo: { address: wallet.address, signer: wallet },
        chainId,
      });
      setClient(newClient);
    } catch (e) {
      console.error("Failed to connect:", e);
      setClient(null);
    }
  };

  return (
    <TNClientContext.Provider value={{ client, connect }}>
      {children}
    </TNClientContext.Provider>
  );
};
```
**Usage:** Wrap your main `App.tsx` with `<TNClientProvider>`. The `ConnectionManager.tsx` component will call the `connect` function.

#### b. Component Logic: Tooltips and Exploration (Updated)

##### `ResultsTable.tsx`: Simplified Tooltip Logic

The tooltips will be simplified as follows:

*   **`getRecord` mode:** On hover, show the full value and the ISO-formatted date string.
*   **`getIndex` mode:** On hover, show the indexed value and the `baseTime` that was provided in the query form.
    *   **Example Title:** `"Indexed from base time: 2023-01-01T00:00:00.000Z"`
*   **`getIndexChange` mode:** TBD, as per the original spec.

##### `ExplorePointView.tsx`: Core Implementation Algorithm

This is the central part of the exploration feature. It will be a recursive component that builds the tree. Let's call it `CompositionNode`.

**Trigger:** The user clicks a cell in the `ResultsTable`. This action passes the `streamLocator` and `eventTime` to the `ExplorePointView`, which then renders the root `<CompositionNode>`.

**Component: `<CompositionNode>`**

*   **Props:** `{ streamLocator: StreamLocator, targetTime: number, weight?: string, level: number }`
*   **Internal Logic (using TanStack Query):**

    1.  **Fetch Node Data:** Use `useQueries` from TanStack Query to fetch all necessary data for this node in parallel.
        *   **Query 1 (Type):** `streamAction.getType(props.streamLocator)`
        *   **Query 2 (Value):** `streamAction.getLastRecord({ stream: props.streamLocator, before: props.targetTime })`
        *   **Query 3 (Children):** `composedAction.describeTaxonomies({ stream: props.streamLocator, latestGroupSequence: true })` (only enabled if type is "composed").

    2.  **Render Node:**
        *   Display the `streamId` and `dataProvider`.
        *   Display the `weight` (if passed in props).
        *   Display the value fetched from `getLastRecord`. Show its `eventTime` to highlight that it might not be the same as `targetTime`.
        *   Show a loading spinner while queries are running. Show an error message if any query fails.

    3.  **Render Children (Recursive Step):**
        *   If the stream type is "composed" and `props.level > 0`:
        *   Map over the `taxonomyItems` from the `describeTaxonomies` result.
        *   For each child, render another `<CompositionNode>`:
            ```jsx
            <CompositionNode
              key={child.childStream.streamId.getId()}
              streamLocator={child.childStream}
              targetTime={props.targetTime} // Pass the same target time down
              weight={child.weight}
              level={props.level - 1}
            />
            ```

## Necessary functions

To build the explorer UI, we'll need several functions from the `@trufnetwork/sdk-js`. Here's a breakdown of what's required.

### 1. Client Initialization

First, we need to initialize the SDK client to connect to the Truf Network. Since this is a browser-based UI, we'll use `BrowserTNClient`.

```typescript
import { BrowserTNClient } from "@trufnetwork/sdk-js";
import { Wallet } from "ethers";

// The user will provide their private key via a text input
const privateKey = "0x..."; // from UI input
const providerUrl = "https://gateway.mainnet.truf.network"; // from UI input

const wallet = new Wallet(privateKey);

const client = new BrowserTNClient({
    endpoint: providerUrl,
    signerInfo: {
        address: wallet.address,
        signer: wallet,
    },
    chainId: "tn-v2", // Or dynamically fetched
});
```

### 2. Listing Available Streams

To allow users to select a stream to query, we need a way to list available streams.

```typescript
interface ListStreamsInput {
    dataProvider?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    blockHeight?: number;
}

// Returns a list of streams on the network
const streams = await client.getListStreams(input: ListStreamsInput);

// Each stream object in the list will have:
// stream.streamId, stream.dataProvider, stream.streamType, stream.createdAt
```

### 3. Querying Stream Data

The core of the UI involves querying streams in three different modes: Record, Index, and Index Change. We can load a generic `Action` object from the client to perform these queries.

```typescript
import { StreamLocator, StreamRecord } from "@trufnetwork/sdk-js";

// First, load the action interface
const streamAction = client.loadAction();

// Define the stream to query
const streamLocator: StreamLocator = {
    streamId: /* StreamId object */,
    dataProvider: /* EthereumAddress object */,
};

// Common input for data retrieval methods
interface GetRecordInput {
  stream: StreamLocator;
  from?: number; // Unix timestamp
  to?: number;   // Unix timestamp
  frozenAt?: number;
  baseTime?: string | number; // Date string or Unix timestamp (for getIndex)
}
```

#### a. Get Record

This fetches the raw records from a stream.

```typescript
const records: StreamRecord[] = await streamAction.getRecord(input: GetRecordInput);
// returns: [{ eventTime: number, value: string }]
```

#### b. Get Index

This computes and fetches the index values for a stream. It requires a `baseTime`.

```typescript
const indexValues: StreamRecord[] = await streamAction.getIndex(input: GetRecordInput);
// returns: [{ eventTime: number, value: string }]
```

#### c. Get Index Change

This computes the change in index values over a specified interval.

```typescript
interface GetIndexChangeInput extends GetRecordInput {
  timeInterval: number; // in seconds
}

const indexChanges: StreamRecord[] = await streamAction.getIndexChange(input: GetIndexChangeInput);
// returns: [{ eventTime: number, value: string }]
```

### 4. Exploring Composed Streams (Taxonomy)

For composed streams, we need to be able to inspect their underlying components (taxonomy). This requires loading a `ComposedAction`.

```typescript
// Load the composed action interface
const composedAction = client.loadComposedAction();

// First, check if a stream is composed
const type = await streamAction.getType(streamLocator);
if (type === "composed") {
    // Then, describe its taxonomy
    const taxonomies = await composedAction.describeTaxonomies({
        stream: streamLocator,
        latestGroupSequence: true, // Get only the most recent taxonomy
    });
    
    /*
    Returns a TaxonomySet[]:
    [{
        stream: StreamLocator,
        startDate: number,
        taxonomyItems: [{
            childStream: StreamLocator,
            weight: string
        }]
    }]
    */
}
```

### 5. Recommended Libraries for High-ROI Development

To build the UI quickly and efficiently, we'll use the following libraries that integrate well with the existing React + Vite setup.

*   **UI Components: MUI (Material-UI)**
    *   **Why:** Provides a comprehensive suite of pre-built React components like `DataGrid` (for tables), `TreeView` (for the composition explorer), text fields, and buttons. This saves significant time by avoiding the need to write them from scratch.
    *   **Packages:** `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/x-data-grid`, `@mui/x-tree-view`.

*   **Data Fetching & State Management: TanStack Query (React Query)**
    *   **Why:** Simplifies fetching, caching, and updating data from the TSN SDK. It handles loading and error states automatically, which means less boilerplate code and a more robust application.
    *   **Package:** `@tanstack/react-query`.

*   **Date Handling: Day.js**
    *   **Why:** A fast, lightweight library for parsing, validating, manipulating, and displaying dates. This will be essential for toggling between UNIX timestamps and human-readable ISO date strings as required.
    *   **Package:** `dayjs`.

### 6. UI Implementation Plan for High ROI

To ensure a fast and effective development process, the following plan outlines the UI structure, state management, and user experience strategy.

#### a. Component Structure

The application will be broken down into the following reusable React components:

*   **`App.tsx`**: The root component. It will manage the main layout, initialize the TanStack Query client, and render other components.
*   **`ConnectionManager.tsx`**: A form component at the top of the UI for inputting and managing the private key and provider URL. It will persist these values to `localStorage`.
*   **`QueryForm.tsx`**: A form containing all inputs required for querying a stream, including:
    *   Stream ID and Data Provider inputs.
    *   A selector for the query mode (`getRecord`, `getIndex`, `getIndexChange`).
    *   Date/time pickers for `from` and `to` parameters.
    *   Conditional inputs that appear based on the selected mode (e.g., `timeInterval` for `getIndexChange`).
*   **`ResultsTable.tsx`**: An MUI `DataGrid` to display the query results. It will be responsible for:
    *   Formatting columns (e.g., converting timestamps to ISO strings).
    *   Handling clicks on cells to trigger the "Explore Point" view.
    *   Displaying tooltips on hover.
*   **`ExplorePointView.tsx`**: An MUI `TreeView` to visualize the composition of a single data point from a composed stream.

#### b. State Management and Data Flow

To keep things simple and robust, we will adopt the following strategy:

*   **URL for Application State:** The current query parameters (stream ID, data provider, query mode, time range) will be stored in the URL's query string (e.g., `?streamId=...&from=...`). This makes the application state bookmarkable, shareable, and navigable via the browser's back/forward buttons.
*   **`localStorage` for User Settings:** The private key and provider URL will be saved to the browser's `localStorage`. This prevents the user from having to re-enter them on every visit.
*   **TanStack Query for Server State:** All asynchronous calls to the TSN SDK will be managed by TanStack Query. This will handle caching, background refetching, and provide simple flags for loading and error states.

#### c. Power-User UX

Since the UI is for a single power user, we can prioritize efficiency and information density:

*   **Layout:** A two-panel layout.
    *   **Left Panel (Sidebar):** Contains the `ConnectionManager` and `QueryForm`. This panel will be collapsible to maximize space for results.
    *   **Right Panel (Main View):** Displays either the `ResultsTable` or the `ExplorePointView`.
*   **Feedback Mechanisms:**
    *   **Loading:** Use MUI `Skeleton` components as placeholders in the results panel to indicate that data is being fetched.
    *   **Errors:** Use MUI `Snackbar` (toast) notifications for non-blocking errors (e.g., "Stream not found," "Invalid date range").
    *   **Connection Status:** A simple status indicator (e.g., a colored dot) to show if the SDK client is successfully connected.
- 