-- Name: visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visits (
    id integer NOT NULL,
    ts timestamp with time zone DEFAULT now(),
    url character varying NOT NULL,
    w integer,
    h integer,
    ident_ts timestamp with time zone,
    proxy character varying
);


--
