-- Name: r; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.r (
    ts timestamp with time zone DEFAULT now(),
    url character varying,
    page_url character varying,
    request jsonb,
    v jsonb,
    ts_resp timestamp with time zone,
    id character varying NOT NULL,
    visit_id integer,
    s integer,
    proxy character varying,
    headers jsonb,
    lmsg character varying,
    resp_headers jsonb
);


--
