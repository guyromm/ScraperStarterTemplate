-- Name: decodeuricomponent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decodeuricomponent(encoded_url text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
  i int;
  output text := encoded_url;
  hex_lower text;
  hex_upper text;
BEGIN
  FOR i IN 1..255 LOOP
    hex_lower := lpad(to_hex(i), 2, '0');
    hex_upper := upper(hex_lower);
    output := replace(output, '%' || hex_lower, chr(i));
    output := replace(output, '%' || hex_upper, chr(i));
  END LOOP;

  RETURN output;
END;
$$;


--
