-- Name: r r_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.r
    ADD CONSTRAINT r_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
