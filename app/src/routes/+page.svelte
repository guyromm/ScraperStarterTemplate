<script>
  import {select} from '../../../common/postgrest.js';
  import {onMount} from 'svelte'

  let items=[];
  onMount(async () => {
    items = await select('emails_parts_parse_preview',{order:'date.desc'})
    
  })
</script>

<table>
  <tbody>
    {#each items as i}
      <tr>
	<td>{i.id}</td>
	<td>{i.sender}</td>
	<td>{i.subject}</td>
	<td>{i.digest}</td>
      </tr>
      {/each}
    </tbody>
  </table>
