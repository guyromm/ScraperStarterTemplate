-- Name: proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxies (
    id character varying NOT NULL,
    lst_use_ts timestamp with time zone,
    is_enabled boolean DEFAULT true
);


--
