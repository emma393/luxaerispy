def render_destination(data):
    return f'''
    <div class="destination-card">
        <img src="{data.get("featured_image","")}" />
        <h1>{data.get("destination_name","")}</h1>
        <p>{data.get("description","")}</p>
    </div>
    '''

def render_route(data):
    return f'''
    <div class="route-card">
        <img src="{data.get("featured_image","")}" />
        <h1>{data.get("origin","")} → {data.get("destination","")}</h1>
        <p>{data.get("description","")}</p>
    </div>
    '''